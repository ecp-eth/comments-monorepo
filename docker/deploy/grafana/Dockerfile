FROM grafana/grafana:12.1.4

USER root

# Install su-exec for switching users
RUN apk add --no-cache su-exec

COPY ./grafana/provisioning /etc/grafana/provisioning
COPY ./entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
