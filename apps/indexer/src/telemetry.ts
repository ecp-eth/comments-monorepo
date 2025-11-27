import { SentryPropagator, SentrySpanProcessor } from "@sentry/opentelemetry";
import * as otelApi from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import packageJson from "../package.json";
import { env } from "./env";

otelApi.propagation.setGlobalPropagator(new SentryPropagator());

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
    [SemanticResourceAttributes.SERVICE_NAME]: packageJson.name,
    [SemanticResourceAttributes.SERVICE_VERSION]: packageJson.version,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessors,
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
