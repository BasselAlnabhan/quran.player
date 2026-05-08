#!/usr/bin/env bash
# Runs after Claude believes a task is "done". Blocks completion if any
# gate is red. Non-zero exit = block; stderr is shown to Claude.
#
# This is the single most important file in .claude/. Without it the agents
# can declare victory on red builds and you'll find out in production.

set -uo pipefail
cd "$(dirname "$0")/../.."

# If package.json doesn't exist yet (very early bootstrap), skip silently.
if [[ ! -f package.json ]]; then
  exit 0
fi

# Skip when this session didn't change anything. The planner and reviewer
# are read-only — their Stop should not gate against pre-existing scaffold
# issues that aren't theirs to fix.
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then
    exit 0
  fi
fi

# If node_modules is missing, the agent forgot to install. Tell it.
if [[ ! -d node_modules ]]; then
  echo "node_modules missing — run 'npm install' before declaring done." >&2
  exit 2
fi

fail=0
log() { echo "▶ $*" >&2; }

run_gate() {
  local name=$1; shift
  log "$name"
  if ! "$@" >/tmp/gate-$$.log 2>&1; then
    echo "✗ GATE FAILED: $name" >&2
    tail -n 40 /tmp/gate-$$.log >&2
    fail=1
  fi
  rm -f /tmp/gate-$$.log
}

run_gate "typecheck" npm run --silent typecheck
run_gate "lint"      npm run --silent lint
run_gate "test"      npm run --silent test -- --run
run_gate "build"     npm run --silent build

if [[ $fail -ne 0 ]]; then
  echo "" >&2
  echo "One or more gates are red. Do not declare the task done." >&2
  echo "Fix the failures above before reporting completion." >&2
  exit 2
fi

exit 0
