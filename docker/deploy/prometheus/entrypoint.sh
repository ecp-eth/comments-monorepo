#!/bin/sh
set -e

# Fix ownership of /prometheus if it exists (volume mount point)
# This is needed because the volume may have been created by root during deployment
if [ -d /prometheus ]; then
    chown -R nobody:nogroup /prometheus
fi

# Switch to nobody user and execute Prometheus
# Prometheus official images typically run as nobody (UID 65534)
# Use gosu if available (cleaner), otherwise fall back to su
if command -v gosu >/dev/null 2>&1; then
    exec gosu nobody /bin/prometheus "$@"
else
    # Fallback: use su with sh -c to properly handle arguments
    # Create a command string that properly escapes arguments
    ARGS=""
    for arg in "$@"; do
        ARGS="$ARGS '$arg'"
    done
    exec su -s /bin/sh nobody -c "exec /bin/prometheus$ARGS"
fi

