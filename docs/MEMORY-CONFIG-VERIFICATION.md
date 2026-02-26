# Memory config verification (cross-session recall)

This doc summarizes how memory is configured so the agent can recall context from **other** chat sessions.

## Your current config (verified)

From `powerdirector.config.json`:

### 1. Memory search is enabled

- **`agents.defaults.memorySearch.enabled`**: `true`  
  → Memory search runs for the default agent.

### 2. Sessions are included as a source

- **`agents.defaults.memorySearch.sources`**: `["memory", "sessions"]`  
- **`agents.defaults.memorySearch.experimental.sessionMemory`**: `true`  

The code only adds `"sessions"` to the effective sources when `experimental.sessionMemory` is `true`. You have both, so **chat transcripts from all sidebar sessions are included** in the index.

### 3. Backend: QMD with sessions on

- **`memory.backend`**: `"qmd"`  
- **`memory.qmd.sessions.enabled`**: `true`  
- **`memory.qmd.sessions.retentionDays`**: `30`  

QMD exports session content from the same SQLite DB (`powerdirector.db`) into markdown under `~/.powerdirector/agents/<agentId>/qmd/sessions/` and indexes it. So **all your sidebar chats** (up to retention) are searchable.

### 4. Sync / update

- **`memory.qmd.update.onBoot`**: `true`  
- **`memory.qmd.update.interval`**: `"5m"`  
- **`memory.qmd.update.debounceMs`**: `15000`  

Sessions are exported and re-indexed on boot and periodically, so new chat activity gets into memory.

### 5. Scope (who can search)

- **`memory.qmd.scope`**: `{ "default": "allow", "rules": [] }`  
  → No restrictions; every session is allowed to run memory search.

---

## Summary

- **Cross-session recall is enabled**: the agent can retrieve relevant snippets from **any** chat (and from `memory` paths), not only the current one.
- **Where it’s defined**:
  - **Agents → defaults → memorySearch**: `enabled`, `sources`, `experimental.sessionMemory`, sync, query, etc.
  - **Memory**: `backend`, `qmd` (sessions, paths, update, limits, scope).

You can change these in the UI under **Config → Agents** (defaults) and **Config → Memory**, or by editing `powerdirector.config.json`.

---

## Optional: same DB for app and QMD

Session content is read from:

- **QMD**: `process.env.DB_PATH || path.join(process.cwd(), "powerdirector.db")`
- **Main app**: `DB_PATH` or `resolvePowerDirectorRoot() + '/powerdirector.db'`

If you start the Next.js UI from a different directory (e.g. `ui`), `process.cwd()` may differ and QMD might look at a different DB. To keep them in sync:

- Set **`DB_PATH`** in the environment (or in **Config → Environment → custom env vars**) to the **full path** to your `powerdirector.db` (e.g. `/path/to/powerdirector/powerdirector.db`).

Then both the app and QMD use the same file regardless of startup cwd.

---

## Quick reference: where config lives

| What | Config path |
|------|-------------|
| Enable/disable memory search | `agents.defaults.memorySearch.enabled` |
| Include chat sessions in index | `agents.defaults.memorySearch.sources` **and** `agents.defaults.memorySearch.experimental.sessionMemory: true` |
| QMD session export | `memory.qmd.sessions.enabled` |
| Memory backend (builtin vs QMD) | `memory.backend` |
| DB path (optional) | Env `DB_PATH` or config env vars |
