import { SentryPropagator, SentrySpanProcessor } from "@sentry/opentelemetry";
import * as otelApi from "@opentelemetry/api";
import { context } from "@opentelemetry/api";
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

openTelemetrySDK.start();

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
 *
 * @param service - The service to wrap
 * @returns The wrapped service
 *
 * @example
 * const service = wrapServiceWithTracing(new Service());
 *
 * service.doSomething();
 */
export function wrapServiceWithTracing<T extends object>(service: T): T {
  return new Proxy(service, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== "function") {
        return original;
      }

      return function (...args: unknown[]) {
        const span = tracer.startSpan(
          `${target.constructor.name}.${String(prop)}`,
        );
        const activeContext = otelApi.trace.setSpan(context.active(), span);

        try {
          const result = context.with(activeContext, () => {
            return original.apply(target, args);
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
