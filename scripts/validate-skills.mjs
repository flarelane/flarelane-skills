#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const skillsRoot = path.join(repoRoot, "skills");

const namePattern = /^[a-z0-9-]+$/;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const block = match[1];
  const nameMatch = block.match(/^name:\s*(.+)$/m);
  const descriptionMatch = block.match(/^description:\s*(.+)$/m);

  const normalize = (value) => value?.trim().replace(/^["']|["']$/g, "");

  return {
    name: normalize(nameMatch?.[1]),
    description: normalize(descriptionMatch?.[1]),
    rawName: nameMatch?.[1]?.trim(),
    rawDescription: descriptionMatch?.[1]?.trim(),
  };
}

// A plain (unquoted) YAML scalar cannot contain ": " — strict parsers such as the
// `yaml` package used by `npx skills add` read it as a nested mapping and reject
// the file ("Nested mappings are not allowed in compact mappings"). The regex
// parser above is blind to that, so check the raw values explicitly.
function unquotedScalarProblem(raw) {
  if (raw === undefined) {
    return null;
  }
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"') && raw.length > 1) ||
    (raw.startsWith("'") && raw.endsWith("'") && raw.length > 1);
  if (quoted) {
    return null;
  }
  if (raw.includes(": ")) {
    return 'contains ": " and must be quoted';
  }
  if (raw.endsWith(":")) {
    return 'ends with ":" and must be quoted';
  }
  if (/\s#/.test(raw)) {
    return 'contains " #" and must be quoted';
  }
  if (/^[-?:,[\]{}#&*!|>%@`]/.test(raw)) {
    return "starts with a YAML indicator character and must be quoted";
  }
  return null;
}

function markdownFilesIn(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

if (!fs.existsSync(skillsRoot)) {
  console.error(`skills directory not found: ${skillsRoot}`);
  process.exit(1);
}

const entries = fs
  .readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (entries.length === 0) {
  console.error("no skills found under skills/");
  process.exit(1);
}

for (const skillName of entries) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");

  if (!fs.existsSync(skillFile)) {
    fail(`missing SKILL.md: skills/${skillName}/SKILL.md`);
    continue;
  }

  const content = fs.readFileSync(skillFile, "utf8");
  const parsed = parseFrontmatter(content);

  if (!parsed) {
    fail(`invalid or missing frontmatter: skills/${skillName}/SKILL.md`);
    continue;
  }

  if (!parsed.name) {
    fail(`missing name field: skills/${skillName}/SKILL.md`);
  } else {
    if (parsed.name !== skillName) {
      fail(`name mismatch: skills/${skillName} != ${parsed.name}`);
    }
    if (parsed.name.length < 1 || parsed.name.length > 64) {
      fail(`invalid name length for ${skillName}`);
    }
    if (!namePattern.test(parsed.name) || parsed.name.startsWith("-") || parsed.name.endsWith("-") || parsed.name.includes("--")) {
      fail(`invalid skill name format: ${parsed.name}`);
    }
  }

  if (!parsed.description) {
    fail(`missing description field: skills/${skillName}/SKILL.md`);
  } else if (parsed.description.length > 1024) {
    fail(`description too long: ${skillName}`);
  }

  for (const [field, raw] of [
    ["name", parsed.rawName],
    ["description", parsed.rawDescription],
  ]) {
    const problem = unquotedScalarProblem(raw);
    if (problem) {
      fail(`unsafe YAML frontmatter: skills/${skillName}/SKILL.md ${field} ${problem}`);
    }
  }

  if (content.includes("[TODO:")) {
    fail(`unfinished TODO markers found: skills/${skillName}/SKILL.md`);
  }

  // Relative markdown links must resolve. Skills are installed as a flat tree
  // under .agents/skills/, so a link that only works from the repo layout (or is
  // off by a directory level) sends the agent to a file that is not there.
  for (const mdFile of markdownFilesIn(skillDir)) {
    const mdContent = fs.readFileSync(mdFile, "utf8");
    for (const [, link] of mdContent.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(link)) {
        continue;
      }
      const target = path.resolve(path.dirname(mdFile), link.split("#")[0]);
      if (!fs.existsSync(target)) {
        fail(
          `broken relative link in ${path.relative(repoRoot, mdFile)}: ${link}`,
        );
      }
    }
  }
}

// Drift and leak guards across the committed skill text, in one pass.
//
// 1. The iOS deployment-target floor is restated in several platform files
//    because each is read standalone. A partial update would leave some
//    platforms pinning against a stale minimum, so every line that states a
//    floor must use one canonical token, and every token must agree.
// 2. Every API path named in the skill text must be one the public API
//    reference documents. This is an allowlist on purpose: it names only
//    published paths, so the check itself reveals nothing beyond the reference.
// 3. Optional and machine-local: terms that must never appear in this public
//    text. Listing them here would publish them, so the list lives outside the
//    repository and this guard runs only where that file exists.
const iosFloorToken = /iOS (\d+\.\d+)\+ \(FlareLane (\d+\.\d+\.\d+)\+\)/g;
const hasIosFloorToken = /iOS \d+\.\d+\+ \(FlareLane \d+\.\d+\.\d+\+\)/;
// "deployment target" in any spelling, carrying a version with or without a minor.
const mentionsDeploymentTarget = /deployment[- ]target|Minimum Deployments/i;
const carriesVersion = /\b\d+\.\d+\b|\biOS \d+\b/;

// Paths published in the public API reference
// (https://flarelane-api-docs.readme.io). Add one here only after confirming
// it on that reference.
const publishedApiPaths = new Set([
  "v1/projects/{PROJECT_ID}/track",
  "v1/projects/{PROJECT_ID}/notifications",
  "v1/projects/{PROJECT_ID}/emails",
  "v1/projects/{PROJECT_ID}/sms",
  "v1/projects/{PROJECT_ID}/alimtalk",
]);
// A v1 path anywhere: bare, with a leading slash, or inside a full URL.
const apiPathPattern = /\bv1\/[A-Za-z0-9{}_:/-]+/g;
const normalizeApiPath = (raw) =>
  raw
    .replace(/\/+$/, "")
    .replace(/\/(?::projectId|PROJECT_ID)(?=\/|$)/g, "/{PROJECT_ID}");

const localDenylistFromEnv = process.env.FLARELANE_SKILLS_LOCAL_DENYLIST;
const localDenylistPath =
  localDenylistFromEnv ||
  path.join(os.homedir(), ".flarelane-skills", "undocumented-api-surface.txt");
let localDenylist = [];
if (fs.existsSync(localDenylistPath)) {
  localDenylist = fs
    .readFileSync(localDenylistPath, "utf8")
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim().toLowerCase())
    .filter(Boolean);
} else if (localDenylistFromEnv) {
  // Explicitly configured but missing must not pass as if it were clean.
  fail(`local denylist not found: ${localDenylistPath}`);
}

const floorVariants = new Map();
let floorMentions = 0;

for (const mdFile of entries.flatMap((skillName) =>
  markdownFilesIn(path.join(skillsRoot, skillName)),
)) {
  const rel = path.relative(repoRoot, mdFile);
  const lines = fs.readFileSync(mdFile, "utf8").split("\n");

  lines.forEach((line, index) => {
    const where = `${rel}:${index + 1}`;

    for (const [, iosVersion, sdkVersion] of line.matchAll(iosFloorToken)) {
      floorMentions += 1;
      const key = `iOS ${iosVersion} / FlareLane ${sdkVersion}`;
      if (!floorVariants.has(key)) {
        floorVariants.set(key, []);
      }
      floorVariants.get(key).push(where);
    }
    if (
      mentionsDeploymentTarget.test(line) &&
      carriesVersion.test(line) &&
      !hasIosFloorToken.test(line)
    ) {
      fail(
        `iOS deployment floor not in canonical form at ${where} — write it as "iOS <x.y>+ (FlareLane <a.b.c>+)"`,
      );
    }

    for (const [raw] of line.matchAll(apiPathPattern)) {
      const apiPath = normalizeApiPath(raw);
      if (!publishedApiPaths.has(apiPath)) {
        fail(
          `API path not in the published allowlist at ${where}: ${apiPath} — confirm it on the public API reference before adding it`,
        );
      }
    }

    const lowered = line.toLowerCase();
    for (const term of localDenylist) {
      if (lowered.includes(term)) {
        fail(`locally denied term "${term}" at ${where}`);
      }
    }
  });
}

if (floorMentions === 0) {
  fail(
    'no iOS deployment floor found in the skills — expected the canonical token "iOS <x.y>+ (FlareLane <a.b.c>+)"',
  );
} else if (floorVariants.size > 1) {
  const detail = [...floorVariants.entries()]
    .map(([key, where]) => `  ${key} at ${where.join(", ")}`)
    .join("\n");
  fail(`iOS deployment floor disagrees across files:\n${detail}`);
}

// Version consistency: the repo VERSION file, the marketplace manifest version,
// and the version embedded in staying-current.md must all agree so the
// "stay on the latest version" self-check compares against a truthful number.
const versionFile = path.join(repoRoot, "VERSION");
const marketplaceFile = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const stayingCurrentFile = path.join(
  skillsRoot,
  "flarelane-sdk-integration",
  "references",
  "staying-current.md",
);

let canonicalVersion = null;

if (!fs.existsSync(versionFile)) {
  fail("missing VERSION file at repo root");
} else {
  canonicalVersion = fs.readFileSync(versionFile, "utf8").trim();
  if (!/^\d+\.\d+\.\d+$/.test(canonicalVersion)) {
    fail(`VERSION is not semver: ${canonicalVersion}`);
  }
}

if (fs.existsSync(marketplaceFile)) {
  const marketplace = JSON.parse(fs.readFileSync(marketplaceFile, "utf8"));
  const marketplaceVersion = marketplace?.metadata?.version;
  if (canonicalVersion && marketplaceVersion !== canonicalVersion) {
    fail(
      `marketplace.json version (${marketplaceVersion}) != VERSION (${canonicalVersion})`,
    );
  }
} else {
  fail("missing .claude-plugin/marketplace.json");
}

if (fs.existsSync(stayingCurrentFile)) {
  const stayingCurrent = fs.readFileSync(stayingCurrentFile, "utf8");
  const embeddedMatch = stayingCurrent.match(
    /Installed skill version:\s*\*\*(\d+\.\d+\.\d+)\*\*/,
  );
  if (!embeddedMatch) {
    fail("could not find embedded version in staying-current.md");
  } else if (canonicalVersion && embeddedMatch[1] !== canonicalVersion) {
    fail(
      `staying-current.md version (${embeddedMatch[1]}) != VERSION (${canonicalVersion})`,
    );
  }
} else {
  fail("missing staying-current.md reference");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`validated ${entries.length} skill(s) at version ${canonicalVersion}`);
