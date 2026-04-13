# FlareLane Skills for AI Agents

FlareLane integration skills for AI coding agents.  
https://www.flarelane.com/

This repository is organized so the same skill set can be used by both Claude Code and Codex-style agents:

- Claude Code uses `.claude-plugin/marketplace.json`
- Codex and other Agent Skills consumers use `skills/` as the source tree, with `.agents/skills/` as a generated local mirror

The structure is intentionally multi-skill friendly so more FlareLane skills can be added later without reshaping the repo.

## Current Skills

| Skill                       | Purpose                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `flarelane-sdk-integration` | Integrate FlareLane SDK public methods and server Track/Send APIs into web, Android, iOS, React Native, Flutter, and backend codebases. |

## Repository Layout

```text
flarelane-skills/
├── .claude-plugin/         # Claude Code marketplace manifest
├── skills/                 # Canonical committed skills
├── scripts/                # Repo maintenance scripts
├── tools/                  # Shared tools and cross-skill references
├── AGENTS.md               # Repo-wide agent instructions
└── CLAUDE.md               # Claude Code entrypoint, points to AGENTS.md
```

## Use With Claude Code

This repository now includes a Claude Code marketplace manifest at `.claude-plugin/marketplace.json`.

If this repo is published on GitHub, install it through Claude Code as a marketplace/plugin repo, then install the `flarelane-skills` plugin from that marketplace.

## Use With Codex and Other Agent Skills Consumers

The canonical skills live under `skills/`. To create a local `.agents/skills/` mirror for the current repo or another workspace, run:

```bash
bash scripts/sync-agents-skills.sh
```

Or target another workspace:

```bash
bash scripts/sync-agents-skills.sh --dry-run /path/to/target-workspace
bash scripts/sync-agents-skills.sh --force /path/to/target-workspace
```

This copies the repo's committed skills into `.agents/skills/` without touching unrelated skills already present in the target workspace. The script refuses to replace an existing same-named skill unless `--force` is passed; use `--dry-run` first to inspect the destination paths.

## Validate Skills

Validate every skill in `skills/`:

```bash
bash scripts/validate-skills.sh
```

## Shared Tools

Shared utilities and cross-skill references should live under `tools/`. See [tools/REGISTRY.md](tools/REGISTRY.md).
