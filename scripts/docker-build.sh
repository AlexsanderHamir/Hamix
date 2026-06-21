#!/usr/bin/env bash
# Rebuild the Hamix dev toolchain image (Go + Node in Docker).
#
# Usage (repo root): ./scripts/docker-build.sh [flags]
#
# Flags:
#   --no-cache   Pass --no-cache to docker compose build
#   --help, -h   Show options

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NO_CACHE=()

show_help() {
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache) NO_CACHE=(--no-cache); shift ;;
    --help|-h) show_help; exit 0 ;;
    *)
      echo "unknown flag: $1 (try --help)" >&2
      exit 2
      ;;
  esac
done

docker compose build "${NO_CACHE[@]}" dev
echo "Built. Start with: docker compose up"
