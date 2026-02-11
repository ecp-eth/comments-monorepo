#!/bin/sh
set -e

if [ -z "$BEARER_TOKEN" ]; then
  echo "Error: BEARER_TOKEN environment variable is not set"
  exit 1
fi

echo -n "$BEARER_TOKEN" > /etc/prometheus/bearer_token

exec prometheus "$@"
