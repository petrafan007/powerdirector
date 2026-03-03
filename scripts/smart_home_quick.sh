#!/usr/bin/env bash
set -euo pipefail

# Quick smart-home helper wrappers.
# Requires: ~/.ha_env (HA_URL + HA_TOKEN)
# Optional: ROBO_DEVICE_ID in ~/.roborock_env

HA_ENV_FILE="${HA_ENV_FILE:-$HOME/.ha_env}"
ROBOROCK_ENV_FILE="${ROBOROCK_ENV_FILE:-$HOME/.roborock_env}"
FRIGATE_CLIP_HELPER="${FRIGATE_CLIP_HELPER:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/frigate_recent_clip.sh}"

cmd="${1:-}"
shift || true

ha_call() {
  local domain="$1" service="$2" payload="$3"
  source "$HA_ENV_FILE"
  curl -sS -X POST "$HA_URL/api/services/$domain/$service" \
    -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

case "$cmd" in
  light-off)
    entity="${1:?entity_id required}"
    ha_call light turn_off "{\"entity_id\":\"$entity\"}" >/dev/null
    echo "OK: turned off $entity"
    ;;
  light-on)
    entity="${1:?entity_id required}"
    pct="${2:-80}"
    ha_call light turn_on "{\"entity_id\":\"$entity\",\"brightness_pct\":$pct}" >/dev/null
    echo "OK: turned on $entity to ${pct}%"
    ;;
  scene)
    entity="${1:?scene entity_id required}"
    ha_call scene turn_on "{\"entity_id\":\"$entity\"}" >/dev/null
    echo "OK: triggered $entity"
    ;;
  vacuum-start|vacuum-stop|vacuum-dock|vacuum-status)
    source "$ROBOROCK_ENV_FILE"
    : "${ROBO_DEVICE_ID:?Set ROBO_DEVICE_ID in $ROBOROCK_ENV_FILE}"
    case "$cmd" in
      vacuum-start) roborock command --device_id "$ROBO_DEVICE_ID" start ;;
      vacuum-stop) roborock command --device_id "$ROBO_DEVICE_ID" stop ;;
      vacuum-dock) roborock command --device_id "$ROBO_DEVICE_ID" home ;;
      vacuum-status) roborock status --device_id "$ROBO_DEVICE_ID" ;;
    esac
    ;;
  frigate-snapshot)
    camera="${1:?camera required}"
    out="${2:-/tmp/frigate-${camera}-$(date +%Y%m%d-%H%M%S).jpg}"
    curl -sS "http://127.0.0.1:5000/api/$camera/latest.jpg" -o "$out"
    echo "$out"
    ;;
  frigate-clip)
    camera="${1:?camera required}"
    label="${2:-}"
    "$FRIGATE_CLIP_HELPER" "$camera" "$label"
    ;;
  *)
    cat <<USAGE
Usage:
  $0 light-off <light.entity_id>
  $0 light-on <light.entity_id> [brightness_pct]
  $0 scene <scene.entity_id>
  $0 vacuum-start|vacuum-stop|vacuum-dock|vacuum-status
  $0 frigate-snapshot <camera> [outfile]
  $0 frigate-clip <camera> [label]
USAGE
    exit 2
    ;;
esac
