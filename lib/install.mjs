import { cpSync, existsSync, mkdirSync, rmSync, chmodSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { prettyPath } from "./targets.mjs";

/**
 * Install one skill into one target base directory.
 *
 * @param {object} skill   - registry entry with .id and .sourcePath
 * @param {object} target  - target entry with .resolve()
 * @param {object} opts    - { force: boolean }
 * @returns {{status: "installed"|"updated"|"skipped", dest: string}}
 */
export function installSkill(skill, target, opts = {}) {
  const base = target.resolve();
  const dest = join(base, skill.id);
  const exists = existsSync(dest);

  if (exists && !opts.force) {
    return { status: "skipped", dest, reason: "already exists" };
  }

  mkdirSync(base, { recursive: true });

  if (exists) {
    rmSync(dest, { recursive: true, force: true });
  }

  cpSync(skill.sourcePath, dest, { recursive: true });
  makeScriptsExecutable(dest);

  return { status: exists ? "updated" : "installed", dest };
}

/** Ensure any .py / .sh helpers stay executable after the copy. */
function makeScriptsExecutable(dir) {
  for (const entry of walk(dir)) {
    if (/\.(py|sh)$/.test(entry)) {
      try {
        chmodSync(entry, 0o755);
      } catch {
        /* best-effort; ignore on filesystems that reject chmod */
      }
    }
  }
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

export { prettyPath };
