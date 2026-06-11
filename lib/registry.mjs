import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repo root (one level up from lib/). */
export const ROOT = join(__dirname, "..");

/** Absolute path to the bundled skills directory. */
export const SKILLS_DIR = join(ROOT, "skills");

/**
 * Load the skill registry (skills.json) and attach the resolved source dir
 * for each skill. Throws a readable error if the manifest is missing/broken.
 */
export function loadRegistry() {
  const manifestPath = join(ROOT, "skills.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`skills.json not found at ${manifestPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(`skills.json is not valid JSON: ${err.message}`);
  }

  const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  if (skills.length === 0) {
    throw new Error("skills.json contains no skills.");
  }

  return skills.map((skill) => {
    const dir = skill.dir || skill.id;
    const sourcePath = join(SKILLS_DIR, dir);
    if (!existsSync(sourcePath)) {
      throw new Error(
        `Skill "${skill.id}" points to a missing directory: ${sourcePath}`
      );
    }
    return { ...skill, dir, sourcePath };
  });
}

/** Find a skill by id (case-insensitive). Returns undefined if not found. */
export function findSkill(registry, id) {
  const needle = String(id).toLowerCase();
  return registry.find((s) => s.id.toLowerCase() === needle);
}
