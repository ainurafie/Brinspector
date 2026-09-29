---
agent: 'agent'
description: 'Implement one checkpoint of a feature spec, with tests, then update progress'
---

Implement the next checkpoint for feature: ${input:feature:Feature ID, e.g. F-002}
Checkpoint: ${input:checkpoint:What to build in this step, e.g. "Summarize button + result card"}

Steps:
1. Read `docs/plan.md`, `specs/features/${input:feature}*/spec.md` and `docs/progress.md`.
2. List the acceptance criteria this checkpoint covers. If anything is ambiguous, stop and ask.
3. Implement only this checkpoint, following `AGENTS.md`.
4. Add or update Jest tests for every new logic path. Run `npm test`.
5. Update `docs/progress.md` (what was added, what is still pending).
6. Reply with a short summary: files changed, criteria covered, criteria still open.
