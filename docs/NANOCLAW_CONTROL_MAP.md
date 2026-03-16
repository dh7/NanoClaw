# NanoClaw Behavior Control Map

This file shows where to configure behavior for your assistant.

## 1) Memory and Persona

- `groups/main/CLAUDE.md`
  - Main behavior/persona for your personal channel (tone, rules, response format).
- `groups/main/conversations/`
  - Conversation memory files created by the assistant.
- `data/sessions/main/.claude/settings.json`
  - Claude runtime/session settings for the `main` group.
- `groups/global/CLAUDE.md`
  - Shared memory for non-main groups.

## 2) Identity and Reply Style

- `.env`
  - `ASSISTANT_NAME` (trigger/assistant name)
  - `ASSISTANT_HAS_OWN_NUMBER` (whether to prefix replies with assistant name)

## 3) Tools the Agent Can Use

- `container/agent-runner/src/index.ts`
  - `allowedTools` list used by Claude Agent SDK runtime.
- `container/skills/`
  - Built-in skills synced into each group session.
- `data/sessions/main/.claude/skills/`
  - Effective skills available for `main` session.

## 4) Filesystem Access (Mounts)

- `src/container-runner.ts`
  - Base mount behavior for main/non-main groups.
- `/home/dh/.config/nanoclaw/mount-allowlist.json`
  - Host-level allowlist for external directories.
- `store/messages.db` (`registered_groups.container_config`)
  - Per-group extra mounts (for example, `own-your-data`, `vault`).

## 5) Channel Routing

- `store/messages.db` (`registered_groups`)
  - Which chat JID is mapped to which group folder.
  - Trigger pattern and whether trigger is required.

## 6) Scheduled Behaviors

- `store/messages.db` (`scheduled_tasks`)
  - Recurring and one-time tasks.
- `store/messages.db` (`task_run_logs`)
  - Task results and historical outputs.

## 7) Runtime Observability

- `logs/nanoclaw.log`
  - Main orchestrator logs.
- `logs/nanoclaw.error.log`
  - Service/runtime errors.
- `groups/main/logs/`
  - Per-run container logs for main group.

## Practical Rule of Thumb

- Change assistant behavior and tone in `groups/main/CLAUDE.md`.
- Change access/safety via mount allowlist + group `container_config`.
- Change automation in `scheduled_tasks`.
- Verify truth from logs + DB, not from old summaries.
