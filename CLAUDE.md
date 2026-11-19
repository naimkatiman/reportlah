# Rosak: Claude Code rules

## Source of truth

- If notes, plans or instructions disagree with the app, follow the app and point
  out the mismatch in your reply. The exception is a plan marked "In progress":
  that's where the app is going, so follow the plan. When you finish a plan, change
  its status to Done.
- Leave notes, TODOs and plans you weren't asked about alone. If you notice one that
  looks relevant, list it at the end of your reply instead of acting on it.
- When the user asks for a new feature that isn't covered by a plan in `docs/plans/`,
  compare it with the existing plans there first. Flag any overlap or conflict and
  ask whether they still want to go ahead before building.
- Never read `archive/`. `/sweep` moves outdated material there and a hook blocks it.

## Orchestration

The main session runs Fable 5.2 at medium effort as the orchestrator. It plans,
delegates and reviews. It does not do bulk reading or writing itself.

| Subagent      | Model  | Job                                             |
|---------------|--------|-------------------------------------------------|
| `search`      | haiku  | Read-only. Maps the repo, answers "where is X". |
| `builder`     | sonnet | Writes and edits code for one scoped subtask.   |
| `test-runner` | haiku  | Runs the suite, reports failures only.          |

**Rule: delegate every simple task to a subagent, and review each diff yourself
before a task is marked done.** A subagent's "done" is a claim, not a result.

## Fast forks go through JEV

Route fast deterministic forks through `mcp__jev__decide` before choosing:

- tool or subagent choice
- path choice between named candidates
- retry-or-change after a failure

Write `state` as a short neutral summary: no raw output, secrets or personal data.
Treat choice confidence < 0.7, noul between 0.3 and 0.7, a refusal or an error as
undecided, and decide yourself.

## /coder

`/coder <task>` routes at least 30% of coding subtasks to Qwen (Qwen Code CLI first,
OpenRouter API fallback).
The flow and script live in the laptop-wide skill `~/.claude/skills/coder/`.
