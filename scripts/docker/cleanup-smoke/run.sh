#!/usr/bin/env bash
set -euo pipefail

cd /repo

export POWERDIRECTOR_STATE_DIR="/tmp/powerdirector-test"
export POWERDIRECTOR_CONFIG_PATH="${POWERDIRECTOR_STATE_DIR}/powerdirector.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${POWERDIRECTOR_STATE_DIR}/credentials"
mkdir -p "${POWERDIRECTOR_STATE_DIR}/agents/main/sessions"
echo '{}' >"${POWERDIRECTOR_CONFIG_PATH}"
echo 'creds' >"${POWERDIRECTOR_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${POWERDIRECTOR_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm powerdirector reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${POWERDIRECTOR_CONFIG_PATH}"
test ! -d "${POWERDIRECTOR_STATE_DIR}/credentials"
test ! -d "${POWERDIRECTOR_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${POWERDIRECTOR_STATE_DIR}/credentials"
echo '{}' >"${POWERDIRECTOR_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm powerdirector uninstall --state --yes --non-interactive

test ! -d "${POWERDIRECTOR_STATE_DIR}"

echo "OK"
