# Staying Current

FlareLane SDKs and this skill change over time. Run this best-effort freshness check once at the start of a task, before editing install files or wiring SDK calls. It is non-blocking: if the network is unavailable or a check is inconclusive, note that and continue with the installed version.

## This skill's version

- Installed skill version: **0.4.0** (keep this in sync with the repo `VERSION` file and `.claude-plugin/marketplace.json`).
- Canonical source: `https://github.com/flarelane/flarelane-skills`.

## Check that the skill itself is up to date

1. Fetch the latest published version from the canonical source:
   - Raw file: `https://raw.githubusercontent.com/flarelane/flarelane-skills/main/VERSION`
2. Compare it to the installed skill version above.
3. If the installed version is behind, tell the user in one line that the FlareLane skill is out of date and how to update, then continue. Surface the command for the user to run — do NOT execute any update or install command yourself:
   - Installed with the `skills` CLI (`npx skills add flarelane/flarelane-skills`): the user can run `npx skills update` (alias `upgrade`), or re-run `npx skills add flarelane/flarelane-skills`.
   - Installed as a Claude Code marketplace plugin (`.claude-plugin/marketplace.json`): the user updates the plugin from its marketplace so the latest repo state is pulled.
4. If the versions match, or the check is inconclusive, proceed without noise.

Do not block the task waiting for an update. Surface the notice, then keep working with what is installed. Never run `npx skills update`, `npx skills add`, or any install/update command automatically — only suggest it to the user.

## Check that the SDK dependency is up to date

The install versions and API details in these references reflect a snapshot and can lag the latest published SDK. Treat the target repo and the live package registry as more authoritative than any pinned example here.

- For a new integration, resolve the latest published SDK version right before editing install files (see "Package sources for latest version lookup" in [shared-surface](shared-surface.md)), then write an exact pinned version unless the target repo has a deliberate range policy.
- If the target repo already pins a FlareLane version, keep that pin unless the user asks to upgrade or the required API is unavailable in the pinned version.
- When a public method is documented here as "available in SDK version X.Y+", confirm it against the version actually installed in the target repo before relying on it. If the installed version is older, use the documented fallback (usually the server Track API) instead.

## Why this matters

- Newer SDK versions add public methods (for example, `setUserAttributes` on mobile SDKs from `1.10.0`). Guidance that hard-codes "method does not exist" goes stale; verifying against the installed version keeps the integration correct.
- A local SDK checkout or an older install can lag the latest published release, so the version on disk is not proof of what the latest SDK supports.
