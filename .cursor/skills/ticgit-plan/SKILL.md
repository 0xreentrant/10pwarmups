---
name: ticgit-plan
description: >-
  Runs ticgit ticket triage before implementing plans in plan mode. Use when
  transitioning from plan to implementation, when about to execute a plan, when
  starting coding after planning, or when the user approves a plan and asks to
  build it. Always read this skill before writing code in plan mode.
---

# TicGit Plan Mode Gate

**Stop.** Before implementing any plan in plan mode, complete this gate. Do not edit source files until the checklist passes.

## Step 1 — Load the agent guide

Run from the repository root:

```sh
ti agent
```

If `ti` is not on PATH, use `~/.cargo/bin/ti agent`. Treat that output as the authoritative ticgit reference for this session.

## Step 2 — Find or create the ticket

Match the approved plan to ticgit work:

```sh
ti list --markdown
ti next --markdown
```

| Situation | Action |
|-----------|--------|
| Plan maps to an existing ticket | `ti checkout <id>` then `ti show --markdown` |
| No matching ticket | `ti new -F /tmp/ticket.md --markdown` (first line = title, rest = description) |
| Unclear which ticket | Ask the user which ticket before coding |

## Step 3 — Claim and inspect spec

```sh
ti claim
ti show <id> --filter .spec
```

- If `.spec` is missing or too thin for the plan, write one before coding:

```sh
ti spec -t <id> -F /tmp/spec.md
```

- Set lifecycle to in-progress:

```sh
ti state in-progress -t <id>
```

## Step 4 — Implement

Proceed with the approved plan. During work:

```sh
ti comment "meaningful progress or blocker"
ti state blocked -t <id>          # when blocked
ti dep <blocker-id> -t <id>       # when ordering matters
```

Prefer `--markdown` when reading ticket data.

## Step 5 — Close out

After implementation and verification:

```sh
ti comment -t <id> "what changed and how it was verified"
ti close -t <id>
ti sync
```

If the work spans a branch review:

```sh
ti review new --ticket <id>
ti review update
```

## Checklist

Copy and complete before the first code edit:

```
- [ ] Ran `ti agent`
- [ ] Ticket checked out or created
- [ ] Spec present and aligned with the plan
- [ ] Claimed and set in-progress
- [ ] Ready to implement
```

## Agent practices (from `ti agent`)

- Use ticket IDs or unique prefixes.
- Prefer `--markdown` for reading tickets.
- Comment when you learn something important or finish a meaningful step.
- Mark blockers with `ti state blocked` and dependencies with `ti dep`.
- Resolve tickets only after implementation and verification are complete.
- Run `ti sync` when collaborating so metadata reaches the remote.
