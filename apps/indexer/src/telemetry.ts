import { SentryPropagator, SentrySpanProcessor } from "@sentry/opentelemetry";
import * as otelApi from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import packageJson from "../package.json";
import { env } from "./env";

const spanProcessors: SpanProcessor[] = [new SentrySpanProcessor()];

if (env.OPENTELEMETRY_GRAFANA_TEMPO_URL) {
  spanProcessors.push(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: env.OPENTELEMETRY_GRAFANA_TEMPO_URL,
      }),
      {
        exportTimeoutMillis:
          env.OPENTELEMETRY_BATCH_PROCESSOR_EXPORT_TIMEOUT_MS,
        maxQueueSize: env.OPENTELEMETRY_BATCH_PROCESSOR_MAX_QUEUE_SIZE,
        scheduledDelayMillis:
          env.OPENTELEMETRY_BATCH_PROCESSOR_SCHEDULED_DELAY_MS,
        maxExportBatchSize:
          env.OPENTELEMETRY_BATCH_PROCESSOR_MAX_EXPORT_BATCH_SIZE,
      },
    ),
  );
}

if (env.NODE_ENV === "development") {
  spanProcessors.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
}

export const openTelemetrySDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: packageJson.name,
    [ATTR_SERVICE_VERSION]: packageJson.version,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessors,
  textMapPropagator: new SentryPropagator(),
});

if (env.OPENTELEMETRY_ENABLED) {
  openTelemetrySDK.start();
}

if (globalThis.PONDER_COMMON) {
  globalThis.PONDER_COMMON.shutdown.add(async () => {
    console.info("Shutting down OpenTelemetry SDK");

    try {
      await openTelemetrySDK.shutdown();

      console.info("OpenTelemetry SDK shut down");
    } catch (error) {
      console.error("Error shutting down OpenTelemetry SDK", error);
    }
  });
}

export const shutdown = openTelemetrySDK.shutdown.bind(openTelemetrySDK);

export const tracer = otelApi.trace.getTracer("indexer");

/**
 * @param name - The name of the span
 * @param fn - The function to execute within the span
 * @returns The result of the function
 *
 * @example
 * const result = await withSpan("get-comments", async () => {
 *   return await getComments();
 * });
 *
 * console.log(result);
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      span.setStatus({ code: otelApi.SpanStatusCode.ERROR });

      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * This function wraps a service and instruments all its methods with OpenTelemetry spans.
 * It also handles direct function calls (like middleware functions) via the apply trap.
 *
 * @param service - The service to wrap (can be an object or a function)
 * @returns The wrapped service
 *
 * @example
 * const service = wrapServiceWithTracing(new Service());
 * service.doSomething();
 *
 * @example
 * const middleware = wrapServiceWithTracing(createMiddleware());
 * await middleware(context, next);
 */
export function wrapServiceWithTracing<
  T extends object | ((...args: unknown[]) => unknown),
>(service: T): T {
  // Helper function to create a traced function wrapper
  const createTracedFunction = (
    fn: (...args: unknown[]) => unknown,
    name: string,
    target?: object,
  ) => {
    return function (...args: unknown[]) {
      const span = tracer.startSpan(name);
      const activeContext = otelApi.trace.setSpan(
        otelApi.context.active(),
        span,
      );

      try {
        const result = otelApi.context.with(activeContext, () => {
          return target ? fn.apply(target, args) : fn(...args);
        });

        if (isPromiseLike(result)) {
          return result.then(
            (value) => {
              span.end();

              return value;
            },
            (error) => {
              span.recordException(
                error instanceof Error ? error : new Error(String(error)),
              );
              span.setStatus({ code: otelApi.SpanStatusCode.ERROR });
              span.end();

              throw error;
            },
          );
        }

        span.end();

        return result;
      } catch (error) {
        span.recordException(
          error instanceof Error ? error : new Error(String(error)),
        );
        span.setStatus({ code: otelApi.SpanStatusCode.ERROR });
        span.end();

        throw error;
      }
    };
  };

  // If the service itself is a function, wrap it directly
  if (typeof service === "function") {
    const functionName =
      service.name ||
      (service as { constructor?: { name?: string } }).constructor?.name ||
      "AnonymousFunction";

    return createTracedFunction(
      service as (...args: unknown[]) => unknown,
      functionName,
    ) as unknown as T;
  }

  // Otherwise, wrap it as an object with methods
  return new Proxy(service, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== "function") {
        return original;
      }

      const methodName = target.constructor?.name
        ? `${target.constructor.name}.${String(prop)}`
        : String(prop);

      return createTracedFunction(
        original as (...args: unknown[]) => unknown,
        methodName,
        target,
      );
    },
  });
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  try {
    return !!value && typeof (value as PromiseLike<T>).then === "function";
  } catch {
    return false;
  }
}
