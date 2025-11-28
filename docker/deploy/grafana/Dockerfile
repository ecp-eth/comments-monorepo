FROM grafana/grafana:12.1.4

USER root

# Make sure the data dir is writable by Grafana's user (UID 472)
RUN chown -R 472:472 /var/lib/grafana \
    && chown -R 472:472 /var/log/grafana \
    && chown -R 472:472 /etc/grafana

# Drop back to Grafana user
USER 472

COPY ./grafana/provisioning /etc/grafana/provisioning

EXPOSE 3000
