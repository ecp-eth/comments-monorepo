# Tempo Configuration

## Environment Variables

### `PROMETHEUS_WRITE_URL`

The `PROMETHEUS_WRITE_URL` environment variable configures where Tempo's metrics generator sends metrics via remote write.

**Default value:** `http://prometheus.railway.internal:9090/api/v1/write`

**Usage:** This should point to your Prometheus instance's remote write API endpoint. The URL format should be:

```
http://<prometheus-host>:<port>/api/v1/write
```

**Example:**

- For Railway internal services: `http://prometheus.railway.internal:9090/api/v1/write`
- For local development: `http://localhost:9090/api/v1/write`
- For external Prometheus: `http://prometheus.example.com:9090/api/v1/write`

The metrics generator uses this endpoint to forward generated metrics (service graphs, span metrics, etc.) to Prometheus for querying and alerting.
