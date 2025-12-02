#!/bin/sh
set -e

# Fix ownership of /var/lib/grafana if it exists (volume mount point)
# This is needed because the volume may have been created by root during deployment
# Grafana runs as UID 472 (GID 472)
if [ -d /var/lib/grafana ]; then
    chown -R 472:472 /var/lib/grafana
fi

# Execute the original Grafana entrypoint
# The base image handles user switching internally
exec /run.sh "$@"

