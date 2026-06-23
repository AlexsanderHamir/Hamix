#!/usr/bin/env bash
# Hamix documentation site verification — source of truth for the CI docs job.
#
# Steps: npm ci (--install), docusaurus build
#
# Usage (repo root): ./scripts/check-docs.sh [flags]
#
# Flags:
#   --verbose, -v   Stream full tool output (CI uses this)
#   --install       Run npm ci in website/ before build
#   --help, -h      Show options
#
# CI: ./scripts/check-docs.sh --install --verbose

set -uo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

VERBOSE=0
INSTALL=0

show_help() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose|-v) VERBOSE=1; shift ;;
    --install) INSTALL=1; shift ;;
    --help|-h) show_help; exit 0 ;;
    *)
      echo "unknown flag: $1 (try --help)" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f website/package.json ]]; then
  echo "website/package.json not found" >&2
  exit 1
fi

# shellcheck source=check-lib.sh
source "$(dirname "$0")/check-lib.sh"

CHECK_BANNER="Hamix check (docs)"
CHECK_SECTION="docs"
CHECK_START=$SECONDS
STEP=0
PASSED=0
TOTAL=1
[[ "$INSTALL" -eq 1 ]] && TOTAL=2

print_banner

if [[ "$INSTALL" -eq 1 ]]; then
  run_cmd "npm ci" bash -c 'cd website && npm ci'
fi

pushd website >/dev/null
run_cmd "docs build" npm run build
popd >/dev/null

complete_ok
