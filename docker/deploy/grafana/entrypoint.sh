#!/bin/sh
set -e

# Fix ownership of /var/lib/grafana if it exists (volume mount point)
# This is needed because the volume may have been created by root during deployment
if [ -d /var/lib/grafana ]; then
    chown -R grafana:grafana /var/lib/grafana
fi

# Switch to grafana user and execute the original Grafana entrypoint
# Use su-exec if available (lighter than su), otherwise fall back to su
if command -v su-exec >/dev/null 2>&1; then
    exec su-exec grafana /run.sh "$@"
else
    exec su -s /bin/sh grafana -c "/run.sh $*"
fi

