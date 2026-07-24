#!/usr/bin/env bash
set -euo pipefail

exec /usr/bin/python3 /root/.hermes/scripts/tengyunzi_ops.py digest --send
