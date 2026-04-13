#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$repo_root/skills"

usage() {
  cat <<'USAGE'
Usage: bash scripts/sync-agents-skills.sh [--dry-run] [--force] [target-workspace]

Copies committed skills into target-workspace/.agents/skills.

Options:
  --dry-run  Print planned changes without writing files.
  --force    Replace an existing same-named target skill.
  -h, --help Show this help.
USAGE
}

dry_run=0
force=0
target_root="$repo_root"
target_root_set=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      dry_run=1
      ;;
    --force)
      force=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ "$target_root_set" -eq 1 ]; then
        echo "only one target workspace can be provided" >&2
        usage >&2
        exit 2
      fi
      target_root="$1"
      target_root_set=1
      ;;
  esac
  shift
done

if [ ! -d "$target_root" ]; then
  echo "target workspace does not exist or is not a directory: $target_root" >&2
  exit 1
fi

target_root="$(cd "$target_root" && pwd)"
target_dir="$target_root/.agents/skills"

if [ -e "$target_dir" ] && [ ! -d "$target_dir" ]; then
  echo "target path exists but is not a directory: $target_dir" >&2
  exit 1
fi

if [ "$dry_run" -eq 0 ]; then
  mkdir -p "$target_dir"
else
  echo "dry run: target skills directory is $target_dir"
fi

synced=0
for skill_dir in "$source_dir"/*; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  target_skill_dir="$target_dir/$skill_name"

  if [ "$dry_run" -eq 1 ]; then
    if [ -e "$target_skill_dir" ]; then
      echo "would replace $target_skill_dir from $skill_dir"
    else
      echo "would create $target_skill_dir from $skill_dir"
    fi
    synced=1
    continue
  fi

  if [ -e "$target_skill_dir" ] && [ "$force" -eq 0 ]; then
    echo "refusing to replace existing skill without --force: $target_skill_dir" >&2
    echo "run with --dry-run to inspect changes, or --force to replace same-named skills" >&2
    exit 1
  fi

  if [ -e "$target_skill_dir" ]; then
    rm -rf -- "$target_skill_dir"
  fi
  cp -R "$skill_dir" "$target_skill_dir"
  echo "synced $skill_name -> $target_skill_dir"
  synced=1
done

if [ "$synced" -eq 0 ]; then
  echo "no skills found under $source_dir" >&2
  exit 1
fi
