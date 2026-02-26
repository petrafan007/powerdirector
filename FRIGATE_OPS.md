# FRIGATE_OPS.md

## Health checks

Run:

```bash
scripts/frigate_health_check.sh
```

Output states:
- `SUMMARY: OK` -> all cameras reporting expected fps
- `SUMMARY: WARN` -> at least one camera degraded
- `CRITICAL` -> API unreachable / no camera data

## Get recent clips

Latest clip for camera:

```bash
scripts/frigate_recent_clip.sh driveway
```

Latest clip by label:

```bash
scripts/frigate_recent_clip.sh driveway car
```

Returns path to downloaded MP4 (default: `/tmp`).

## Quick snapshot

```bash
scripts/smart_home_quick.sh frigate-snapshot front_door
```

## Recovery runbook

1. Check API + camera fps
   - `scripts/frigate_health_check.sh`
2. If degraded, restart Frigate container
   - `docker restart frigate`
3. Re-check
   - `scripts/frigate_health_check.sh`
4. Pull a recent clip to confirm events are flowing
   - `scripts/frigate_recent_clip.sh front_door`
