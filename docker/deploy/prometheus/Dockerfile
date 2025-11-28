FROM prom/prometheus:v3.7.3
COPY prometheus.yml /etc/prometheus/
EXPOSE 9090
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus-tsdb", "--web.enable-remote-write-receiver"]