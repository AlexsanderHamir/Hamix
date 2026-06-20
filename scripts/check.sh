#!/usr/bin/env bash
# T2A full verification — runs check-go.sh then check-web.sh.
#
# Usage (repo root): ./scripts/check.sh [flags]
#
# Flags:
#   --verbose, -v     Stream full tool output
#   --go-only         Run check-go.sh only
#   --web-only        Run check-web.sh only
#   --install         Pass --install to check-web.sh (npm ci)
#   --skip-funclog    Pass --skip-funclog to check-go.sh
#   --help, -h        Show options
#
# Default (quiet): one line per step on success; full output only on failure.
# CI runs check-go.sh and check-web.sh directly — see .github/workflows/ci.yml

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$script_dir/.." && pwd)"
cd "$repo"

VERBOSE=0
GO_ONLY=0
WEB_ONLY=0
INSTALL=0
SKIP_FUNCLOG=0

show_help() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose|-v) VERBOSE=1; shift ;;
    --go-only) GO_ONLY=1; shift ;;
    --web-only) WEB_ONLY=1; shift ;;
    --install) INSTALL=1; shift ;;
    --skip-funclog) SKIP_FUNCLOG=1; shift ;;
    --help|-h) show_help; exit 0 ;;
    *)
      echo "unknown flag: $1 (try --help)" >&2
      exit 2
      ;;
  esac
done

if [[ "$GO_ONLY" -eq 1 && "$WEB_ONLY" -eq 1 ]]; then
  echo "cannot use --go-only and --web-only together" >&2
  exit 2
fi

go_args=()
web_args=()
[[ "$VERBOSE" -eq 1 ]] && go_args+=(--verbose) && web_args+=(--verbose)
[[ "$SKIP_FUNCLOG" -eq 1 ]] && go_args+=(--skip-funclog)
[[ "$INSTALL" -eq 1 ]] && web_args+=(--install)

if [[ "$WEB_ONLY" -eq 1 ]]; then
  exec "$script_dir/check-web.sh" "${web_args[@]}"
fi

if [[ "$GO_ONLY" -eq 1 ]]; then
  exec "$script_dir/check-go.sh" "${go_args[@]}"
fi

"$script_dir/check-go.sh" "${go_args[@]}"
"$script_dir/check-web.sh" "${web_args[@]}"
