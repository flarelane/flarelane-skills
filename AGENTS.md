# AGENTS.md

Guidelines for AI agents working in this repository.

## Repository Overview

This repository contains **FlareLane Agent Skills** for AI coding agents. It is structured to support both:

- **Claude Code** through `.claude-plugin/marketplace.json`
- **Codex and other Agent Skills consumers** through the `skills/` source tree and a generated `.agents/skills/` mirror

The current focus is FlareLane SDK integration across web, Android, iOS, React Native, and Flutter. More skills will be added over time, so keep the repository multi-skill friendly.

## Repository Structure

```text
flarelane-skills/
├── .claude-plugin/
│   └── marketplace.json
├── skills/
│   └── skill-name/
│       ├── SKILL.md
│       ├── agents/
│       └── references/
├── scripts/
│   ├── sync-agents-skills.sh
│   ├── validate-skills.mjs
│   └── validate-skills.sh
├── tools/
│   └── REGISTRY.md
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## Source of Truth

- `skills/` is the canonical source for committed skills.
- `.agents/skills/` is generated for local consumption and should not be treated as the source of truth.
- If a skill exists in both places, edit `skills/` and then re-run the sync script.

## Commands

Validate all committed skills:

```bash
bash scripts/validate-skills.sh
```

Generate or refresh the local `.agents/skills/` mirror in this repo:

```bash
bash scripts/sync-agents-skills.sh
```

Generate or refresh the mirror into another workspace:

```bash
bash scripts/sync-agents-skills.sh /path/to/target-workspace
```

## Skill Rules

- Keep each skill under `skills/<name>/`.
- `name` must exactly match the parent directory name.
- Use lowercase letters, numbers, and hyphens only.
- Keep `SKILL.md` concise; move detailed material into `references/`.
- Prefer one reusable skill per domain or workflow, not one giant catch-all file.
- When a skill depends on shared repo knowledge, point to a shared reference instead of duplicating content.

## Versioning

- The repo-wide skill version lives in the root `VERSION` file.
- It is mirrored in `.claude-plugin/marketplace.json` (`metadata.version`) and in `skills/flarelane-sdk-integration/references/staying-current.md` (the "Installed skill version" line).
- These three must stay in sync; `scripts/validate-skills.mjs` fails the build if they drift.
- When making a user-facing change to any skill, bump all three together. Consumers rely on this version for the "stay on the latest version" freshness check.

## Compatibility Notes

- Claude Code reads `CLAUDE.md` and the marketplace manifest under `.claude-plugin/`.
- Codex-friendly consumers can use the generated `.agents/skills/` mirror.
- Keep repository-level instructions in `AGENTS.md`; `CLAUDE.md` should stay as a thin pointer.

## Future Expansion

When adding more skills later:

- keep the directory flat under `skills/`
- add each new skill path to `.claude-plugin/marketplace.json`
- run the validator
- re-run the sync script so `.agents/skills/` stays current
- use `tools/` only for shared utilities or cross-skill references
