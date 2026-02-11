FROM prom/prometheus:v3.7.3

COPY prometheus.yml /etc/prometheus/
COPY entrypoint.sh /entrypoint.sh

EXPOSE 9090

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--web.enable-remote-write-receiver"]
