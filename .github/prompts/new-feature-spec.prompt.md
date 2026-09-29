---
agent: 'agent'
description: 'Draft a new feature spec from the team template'
---

Create a new feature spec.

Feature ID: ${input:id:e.g. F-004}
Feature name: ${input:name:e.g. Session summary}
What it should do: ${input:idea:Describe the idea in a few sentences}

Rules:
- Copy `specs/features/_template/feature-template.md` into `specs/features/${input:id}-<kebab-name>/spec.md`.
- Fill every section: Intent, Behavior (table), Constraints, Edge cases, Acceptance criteria (one per line, testable), Data.
- Stay consistent with `docs/plan.md` (API contract, privacy rules, categories).
- List open questions at the bottom instead of guessing.
- Add the feature to `specs/features/README.md`.
- Do NOT write implementation code.
