FROM grafana/tempo:2.9.0
COPY ./config /etc

ENV PROMETHEUS_WRITE_URL=http://prometheus.railway.internal:9090/api/v1/write

EXPOSE 3200 9095 4317 4318

ENTRYPOINT []

CMD ["/tempo", "-config.file=/etc/tempo.yml", "--config.expand-env=true"]