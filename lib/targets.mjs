import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Install targets. Each target resolves to a base directory that holds
 * one folder per skill. `resolve()` is a function so the project-local
 * target picks up the directory the CLI is run from.
 */
export const TARGETS = [
  {
    id: "claude",
    label: "Claude Code",
    hint: "~/.claude/skills",
    resolve: () => join(homedir(), ".claude", "skills"),
  },
  {
    id: "codex",
    label: "Codex",
    hint: "~/.codex/skills",
    resolve: () => join(homedir(), ".codex", "skills"),
  },
  {
    id: "project",
    label: "Project-local",
    hint: "./.claude/skills (current directory)",
    resolve: () => join(process.cwd(), ".claude", "skills"),
  },
];

export function findTarget(id) {
  const needle = String(id).toLowerCase();
  return TARGETS.find((t) => t.id.toLowerCase() === needle);
}

/** Display path with the home dir collapsed back to ~ for readability. */
export function prettyPath(abs) {
  const home = homedir();
  return abs.startsWith(home) ? abs.replace(home, "~") : abs;
}
