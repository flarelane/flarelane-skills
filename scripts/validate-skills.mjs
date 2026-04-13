#!/usr/bin/env node

import fs from "node:fs";
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
  };
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

  if (content.includes("[TODO:")) {
    fail(`unfinished TODO markers found: skills/${skillName}/SKILL.md`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`validated ${entries.length} skill(s)`);
