---
name: sweep
description: Find outdated guidance that could mislead Claude in this repo (code TODOs, plans and ticket statuses, CLAUDE.md, .claude/rules, auto-memory), have a fresh subagent verify every item against the code and git history, then propose what to archive, update or cut and wait for approval before changing anything.
disable-model-invocation: true
argument-hint: "[optional scope: todos | specs | claude-md | rules | memory]"
---

# /sweep: clear out outdated guidance

Notes that no longer match the app mislead you on later tasks. This skill finds them, **proves** they're outdated with a separate, fresh subagent, and proposes fixes. It changes nothing until the user approves.

Scope: if arguments were given (`$ARGUMENTS`), sweep only those sources. Otherwise sweep all of them.

## Ground rules

- **Read-only until the user says yes.** Phases 1–3 only read and report. No edits, moves or commits before approval.
- **Prove it or leave it.** Only items the verifier marks OUTDATED, with concrete evidence, become proposals. UNPROVEN means leave it alone.
- **Never read `archive/`.** It's blocked by a hook (`.claude/hooks/guard-archive.mjs`) and skipped by Grep/Glob via `.ignore`. Don't work around the block. Search with the Grep and Glob tools; scope git history to paths (no unscoped `git log -p`, no `grep -r`, no `git grep` without `--` paths). If the Grep tool isn't available in this session, search in Bash with `rg` (it reads `.ignore`) or `git grep -n '<pattern>' -- <folders>`, naming the folders.
- **Plans marked "In progress" are where the app is going** (see the project CLAUDE.md). A gap between such a plan and the code isn't staleness. Only its *status* can be outdated (for example the work is actually finished).
- **Recorded decisions aren't disproved by code.** If a memory entry, rule or requirement says one thing and the code does another, that's a conflict for the user to settle, not an outdated note. Report it under "Conflicts", don't propose cutting it.
- Don't touch blocks that tools generate into `AGENTS.md` or other files (they're rewritten automatically), or the user's global `~/.claude/CLAUDE.md` (personal preferences, nothing to check against the app).

## Phase 0: learn the layout (you)

Before collecting, work out where this project keeps things. Read the project `CLAUDE.md` and list the top level of the repo.

- **Code folders**: where the app's source lives (for example `src/`, `app/`, `lib/`, `components/`, `packages/*/src`, `tests/`), plus root config files. Skip dependencies, build output and generated code (`node_modules/`, `dist/`, `.next/`, `build/`, `vendor/`, lockfiles).
- **Plans**: where specs, PRDs, tickets, roadmaps and design docs live (for example `specs/`, `docs/`, `plans/`, `prd.md`, `ROADMAP.md`). Note which files are per-feature tickets.
- **Commands**: the project's lint and typecheck/build commands, from `CLAUDE.md`, `package.json`, `Makefile`, `pyproject.toml` or similar.

If the project has no plans folder, skip the `specs` source.

## Phase 1: collect candidates (you)

Gather concrete, checkable claims. Don't judge them yet and don't filter by your own hunch; the verifier decides. For each, record an ID, `file:line`, the exact quote, and a neutral question ("Is it true that …?").

1. **Code TODOs** (`todos`): Grep for `TODO|FIXME|HACK|XXX|@deprecated` in the code folders and root config files. Add `git blame -L <line>,<line> -- <file>` (commit + date) to each. Question: is the work it describes done, moot, or still pending?
2. **Specs** (`specs`): every plan, PRD and ticket file found in Phase 0.
   - **Status.** Every ticket should carry a status of `Not started`, `In progress` or `Done`: a `| **Status** | Done |` row in its header table, or a `**Status:** Done` line under its title. Keep whichever format the project already uses. For every ticket, ask the verifier for its real status, whether or not a status exists yet. A missing status, or one that disagrees with the verified status, becomes an "update".
   - Concrete claims about what exists: routes, files, tables, stubs, "next ticket", milestones done.
3. **CLAUDE.md** (`claude-md`): every `CLAUDE.md` in the repo (and the hand-written parts of `AGENTS.md`). Pull out the factual lines: status, stubs, routes and file paths, function and table names, commands, conventions that name code. Skip pure style advice that can't be checked.
4. **Rules** (`rules`): every file in `.claude/rules/`. Claims that name helpers, files or behaviour (for example "show dates through `lib/dates.ts`").
5. **Memory** (`memory`): the auto-memory folder named in your system prompt (usually `~/.claude/projects/<this-project's-path-with-dashes>/memory/`). If there is none, skip this source. Read `MEMORY.md` and every memory file. Check index ↔ file consistency yourself (dangling pointers, files missing from the index); that's mechanical. Send each memory's factual claims to the verifier.

Also note any references that point at files or symbols, so the verifier can check they still exist.

## Phase 2: verify (fresh subagents)

Launch the `sweep-verifier` agent (`subagent_type: "sweep-verifier"`). If that type isn't available yet (new agent files load at session start), use `general-purpose` and paste the body of `.claude/agents/sweep-verifier.md` at the top of the prompt. Never use a fork: the point is a fresh start without your context.

- Split the candidates into at most 3 batches by source (for example: TODOs + rules; specs and ticket statuses; CLAUDE.md + memory) and launch them in one message so they run in parallel. A small sweep can use one.
- Each prompt contains only: the claim IDs, `file:line`, exact quotes, the neutral questions, and for tickets "Determine this ticket's real status". **Don't include your suspicions or reasons**, so the verifier isn't anchored on them.
- Wait for all results. Don't redo their checks yourself. If a result is unclear or lacks evidence, treat that item as UNPROVEN (or send a follow-up to the same agent with SendMessage asking for the evidence).

## Phase 3: propose (then stop)

Turn each OUTDATED item into exactly one proposal:

- **Archive**: a whole documentation file (or memory file) that is entirely superseded and no longer guides current or future work. Before proposing, Grep for references to it (its path, its ticket number, requirement IDs that code comments cite). If anything live still points at it, propose an update instead. Never archive code files; code TODOs are only ever updated or cut.
- **Update**: partly right. Give the exact old text and the new text, using the verifier's corrected text and evidence.
- **Cut**: wrong or finished with nothing worth keeping (a done TODO comment, a stub note for a stub that's gone). Git history keeps the old text.

Present it like this, numbered across all groups so the user can pick:

```
## Archive
1. `docs/…/plan.md`: <what it says> → <why it's outdated> (evidence: `abc1234 subject`, `src/x.ts:42`)

## Update
2. `CLAUDE.md:15`: "<old>" → "<new>"; <why> (evidence: …)

## Cut
3. `src/foo.ts:88` TODO "<text>"; <why> (evidence: …)

## Conflicts (no change proposed, your call)
- `memory/x.md` says … but `src/…:12` does …, since `abc1234 subject`.

## Left alone
<count> items checked and current; <count> couldn't be proven either way (list the notable ones in one line each).
```

End with: "Reply **yes** to apply all, or list the numbers to apply." Then **stop and end your turn**. Don't edit anything in this turn.

## Phase 4: apply (only after an explicit yes)

Apply only the approved numbers, nothing else.

- **Edits** (updates, cuts, status rows, `MEMORY.md` lines): use the Edit tool. Never edit files with `sed`, heredocs or redirects.
- **Archive**: move whole files with the helper, which never prints contents:
  `bash .claude/skills/sweep/scripts/archive.sh "<short reason>" <path> [<path> …]`
  Repo files land in `archive/<YYYY-MM-DD>/<original path>` (via `git mv`) and are logged in `archive/INDEX.md`. Memory files land in `archive/memory/<date>/` (gitignored) with their own index. Run the helper on its own, not chained with other commands. After archiving a memory file, remove its line from `MEMORY.md` with Edit. After archiving a doc, fix any links to it you found in Phase 3 (they were part of the approved proposal).
- If any code file changed (TODO comments), run the project's lint and typecheck/build commands from Phase 0. Docs-only changes need no build.
- Commit the repo changes: summary line `Sweep: archive, update and cut outdated guidance`, with a bulleted body listing each change. Memory lives outside the repo, so mention memory changes in your reply instead.
- Reply with what changed, what was archived and where, and anything you skipped or that failed.
