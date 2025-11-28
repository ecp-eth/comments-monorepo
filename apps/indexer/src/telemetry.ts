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
