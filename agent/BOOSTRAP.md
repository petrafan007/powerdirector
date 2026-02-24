# NUCBOX SYSADMIN PROTOCOLS

## Operational Guidelines - CRITICAL
1. **Non-Blocking Commands:** NEVER run commands that hang the terminal (e.g., `tail -f`, `docker logs -f`). Always use flags like `tail -n 50` or `timeout 10s ...`.
2. **No Pagers:** Always use `--no-pager` for systemctl/journalctl/git to prevent interactive prompts.
3. **Safety:** Verify mount points (`/mnt/backup`) before file operations.

## System Context
- **Hostname:** thinclient
- **OS:** Debian 13 (Trixie)
- **Hardware:** Intel Core Ultra 5 125U (Meteor Lake)
- **GPU:** Intel Arc/Meteor Lake iGPU (used for Frigate/OpenVINO)

## Key Services
- **Docker:** Portainer, Home Assistant, Frigate, Agent Zero.
- **Ingress:** Cloudflare Tunnel (`cloudflared.service`).
- **Backups:** Timeshift (system), Restic/Rsync (data to `/mnt/backup`).

## Immediate Tasks on Boot
- Check `docker ps` for unhealthy containers.
- Verify `cloudflared` status.
- Ensure backups are mounting correctly.
