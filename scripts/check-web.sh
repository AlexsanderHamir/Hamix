#!/usr/bin/env bash
# T2A web verification — source of truth for the CI web job.
#
# Steps: npm ci (--install), web test, web lint, web standards, web build
#
# Usage (repo root): ./scripts/check-web.sh [flags]
#
# Flags:
#   --verbose, -v   Stream full tool output (CI uses this)
#   --install       Run npm ci in web/ before other steps
#   --help, -h      Show options
#
# CI: ./scripts/check-web.sh --install --verbose

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

if [[ ! -f web/package.json ]]; then
  echo "web/package.json not found" >&2
  exit 1
fi

CHECK_BANNER="T2A check (web)"
CHECK_SECTION="web"
CHECK_START=$SECONDS
STEP=0
PASSED=0
TOTAL=4
[[ "$INSTALL" -eq 1 ]] && TOTAL=5

# shellcheck source=check-lib.sh
source "$(dirname "$0")/check-lib.sh"

web_test_stats() {
  local log="$1"
  if grep -qE 'Tests +[0-9]+ passed' "$log" 2>/dev/null; then
    STEP_STATS="$(grep -oE 'Tests +[0-9]+ passed' "$log" | tail -1 | sed 's/Tests /tests /')"
  fi
}

web_lint_stats() {
  local log="$1"
  local warnings
  warnings="$(grep -oE '[0-9]+ warnings' "$log" 2>/dev/null | tail -1 || true)"
  if [[ -n "$warnings" && "$warnings" != "0 warnings" ]]; then
    STEP_STATS="$warnings"
  fi
}

run_web_test() {
  local label="web test"
  local start=$SECONDS
  local log
  log="$(mktemp "${TMPDIR:-/tmp}/t2a-check.XXXXXX")"
  local reporter_args=(--run)
  if [[ "$VERBOSE" != "1" ]]; then
    reporter_args+=(--reporter=basic)
  fi

  step_prefix
  printf '%s ' "$label"

  if [[ "$VERBOSE" == "1" ]]; then
    echo "${C_CYAN}...${C_RESET}"
    set +e
    npm test -- "${reporter_args[@]}"
    local code=$?
    set -e
    local elapsed=$((SECONDS - start))
    add_section_time "$elapsed"
    if [[ $code -eq 0 ]]; then
      PASSED=$((PASSED + 1))
      return 0
    fi
    fail_step "$label" "$code"
  fi

  set +e
  npm test -- "${reporter_args[@]}" >"$log" 2>&1
  local code=$?
  set -e
  local elapsed=$((SECONDS - start))
  add_section_time "$elapsed"

  if [[ $code -eq 0 ]]; then
    web_test_stats "$log"
    PASSED=$((PASSED + 1))
    print_ok_line "$label" "$elapsed" "${STEP_STATS:-}"
    STEP_STATS=""
    rm -f "$log"
    return 0
  fi

  echo "${C_RED}FAILED${C_RESET}"
  cat "$log"
  rm -f "$log"
  fail_step "$label" "$code"
}

run_web_lint() {
  local label="web lint"
  local start=$SECONDS
  local log
  log="$(mktemp "${TMPDIR:-/tmp}/t2a-check.XXXXXX")"

  step_prefix
  printf '%s ' "$label"

  if [[ "$VERBOSE" == "1" ]]; then
    echo "${C_CYAN}...${C_RESET}"
    set +e
    npm run lint
    local code=$?
    set -e
    local elapsed=$((SECONDS - start))
    add_section_time "$elapsed"
    if [[ $code -eq 0 ]]; then
      PASSED=$((PASSED + 1))
      return 0
    fi
    fail_step "$label" "$code"
  fi

  set +e
  npm run lint >"$log" 2>&1
  local code=$?
  set -e
  local elapsed=$((SECONDS - start))
  add_section_time "$elapsed"

  if [[ $code -eq 0 ]]; then
    web_lint_stats "$log"
    PASSED=$((PASSED + 1))
    print_ok_line "$label" "$elapsed" "${STEP_STATS:-}"
    STEP_STATS=""
    rm -f "$log"
    return 0
  fi

  echo "${C_RED}FAILED${C_RESET}"
  cat "$log"
  rm -f "$log"
  fail_step "$label" "$code"
}

print_banner

if [[ "$INSTALL" -eq 1 ]]; then
  run_cmd "npm ci" bash -c 'cd web && npm ci'
fi

pushd web >/dev/null
run_web_test
run_web_lint
run_cmd "web standards" npm run check:standards
run_cmd "web build" npm run build
popd >/dev/null

complete_ok
