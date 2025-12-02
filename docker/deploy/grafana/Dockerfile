FROM grafana/grafana:12.1.4

USER root

COPY ./grafana/provisioning /etc/grafana/provisioning
COPY ./entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
