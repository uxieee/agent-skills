#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadRegistry, findSkill } from "../lib/registry.mjs";
import { TARGETS, findTarget, prettyPath } from "../lib/targets.mjs";
import { installSkill } from "../lib/install.mjs";
import { multiSelect, confirm, closePrompt } from "../lib/prompt.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function printHelp() {
  console.log(`
${c.bold("agent-skills")} ${c.dim("v" + pkg.version)} — install agent skills into Claude Code & Codex

${c.bold("USAGE")}
  npx agent-skills                      Interactive installer (pick skills + targets)
  npx agent-skills list                 List available skills
  npx agent-skills install [skills...]  Install named skills (non-interactive)

${c.bold("INSTALL OPTIONS")}
  --target <ids>     Comma-separated: claude,codex,project   (default: claude)
  --all              Install every available skill
  --force            Overwrite skills that are already installed
  -y, --yes          Skip the confirmation prompt

${c.bold("EXAMPLES")}
  npx agent-skills
  npx agent-skills install get-ghl-workflow-json --target claude,codex
  npx agent-skills install --all --target claude --force --yes

${c.bold("TARGETS")}
${TARGETS.map((t) => `  ${t.id.padEnd(9)} ${t.label} ${c.dim("(" + t.hint + ")")}`).join("\n")}
`);
}

function parseFlags(args) {
  const flags = { target: null, all: false, force: false, yes: false, _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--target" || a === "-t") flags.target = args[++i];
    else if (a.startsWith("--target=")) flags.target = a.slice("--target=".length);
    else if (a === "--all") flags.all = true;
    else if (a === "--force" || a === "-f") flags.force = true;
    else if (a === "--yes" || a === "-y") flags.yes = true;
    else flags._.push(a);
  }
  return flags;
}

function listSkills(registry) {
  console.log(`\n${c.bold("Available skills")} ${c.dim("(" + registry.length + ")")}\n`);
  for (const s of registry) {
    console.log(`  ${c.cyan(s.id)} ${c.dim("v" + s.version)}`);
    console.log(`    ${s.summary}`);
    if (s.requires?.length) console.log(`    ${c.dim("requires: " + s.requires.join(", "))}`);
    console.log("");
  }
}

function resolveTargets(spec) {
  const ids = spec.split(/[\s,]+/).filter(Boolean);
  const targets = [];
  for (const id of ids) {
    const t = findTarget(id);
    if (!t) {
      console.error(c.red(`Unknown target: "${id}". Valid: ${TARGETS.map((x) => x.id).join(", ")}`));
      process.exit(1);
    }
    targets.push(t);
  }
  return targets;
}

function runInstall(skills, targets, opts) {
  let changed = 0;
  for (const target of targets) {
    console.log(`\n${c.bold(target.label)} ${c.dim("→ " + prettyPath(target.resolve()))}`);
    for (const skill of skills) {
      const r = installSkill(skill, target, { force: opts.force });
      if (r.status === "skipped") {
        console.log(`  ${c.yellow("skip")}  ${skill.id} ${c.dim("(already installed — use --force to overwrite)")}`);
      } else {
        changed++;
        const tag = r.status === "updated" ? c.yellow("updated") : c.green("installed");
        console.log(`  ${tag} ${skill.id}`);
      }
    }
  }
  return changed;
}

function reportRequirements(skills) {
  const reqs = new Set();
  for (const s of skills) for (const r of s.requires || []) reqs.add(r);
  if (reqs.size) {
    console.log(`\n${c.dim("Note: these skills need on your PATH: " + [...reqs].join(", "))}`);
  }
}

async function interactive(registry) {
  console.log(`${c.bold("agent-skills")} ${c.dim("v" + pkg.version)}`);
  console.log(c.dim("Install agent skills into Claude Code & Codex.\n"));

  const chosenSkills = await multiSelect(
    c.bold("Which skills do you want to install?"),
    registry.map((s) => ({ label: s.id, hint: s.summary })),
    registry.map((_, i) => i) // default: all
  );
  if (chosenSkills.length === 0) {
    console.log(c.yellow("\nNo skills selected. Nothing to do."));
    return;
  }
  const skills = chosenSkills.map((c) => findSkill(registry, c.label));

  const chosenTargets = await multiSelect(
    c.bold("Where should they be installed?"),
    TARGETS.map((t) => ({ label: t.label, hint: t.hint })),
    [0] // default: Claude Code
  );
  if (chosenTargets.length === 0) {
    console.log(c.yellow("\nNo targets selected. Nothing to do."));
    return;
  }
  const targets = chosenTargets.map((ch) => TARGETS.find((t) => t.label === ch.label));

  console.log(`\n${c.bold("Plan")}`);
  console.log(`  Skills:  ${skills.map((s) => s.id).join(", ")}`);
  console.log(`  Targets: ${targets.map((t) => `${t.label} (${prettyPath(t.resolve())})`).join(", ")}`);

  const ok = await confirm("\nProceed?", true);
  if (!ok) {
    console.log(c.yellow("Cancelled."));
    return;
  }

  // Interactive installs overwrite by default after explicit confirmation.
  const changed = runInstall(skills, targets, { force: true });
  reportRequirements(skills);
  console.log(`\n${c.green("Done.")} ${changed} skill install(s) written.`);
  console.log(c.dim("Restart your agent (or start a new session) to pick up new skills."));
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) return printHelp();
  if (argv.includes("--version") || argv.includes("-v")) return console.log(pkg.version);

  let registry;
  try {
    registry = loadRegistry();
  } catch (err) {
    console.error(c.red("Failed to load skill registry: " + err.message));
    process.exit(1);
  }

  const cmd = argv[0];

  if (!cmd) return interactive(registry);
  if (cmd === "list" || cmd === "ls") return listSkills(registry);

  if (cmd === "install" || cmd === "add" || cmd === "i") {
    const flags = parseFlags(argv.slice(1));

    let skills;
    if (flags.all) {
      skills = registry.slice();
    } else if (flags._.length) {
      skills = [];
      for (const id of flags._) {
        const s = findSkill(registry, id);
        if (!s) {
          console.error(c.red(`Unknown skill: "${id}". Run "npx agent-skills list".`));
          process.exit(1);
        }
        skills.push(s);
      }
    } else {
      console.error(c.red('No skills specified. Pass skill ids, --all, or run with no args for the wizard.'));
      process.exit(1);
    }

    const targets = resolveTargets(flags.target || "claude");

    console.log(`\n${c.bold("Plan")}`);
    console.log(`  Skills:  ${skills.map((s) => s.id).join(", ")}`);
    console.log(`  Targets: ${targets.map((t) => `${t.label} (${prettyPath(t.resolve())})`).join(", ")}`);

    if (!flags.yes) {
      const ok = await confirm("\nProceed?", true);
      if (!ok) return console.log(c.yellow("Cancelled."));
    }

    const changed = runInstall(skills, targets, { force: flags.force });
    reportRequirements(skills);
    console.log(`\n${c.green("Done.")} ${changed} skill install(s) written.`);
    console.log(c.dim("Restart your agent (or start a new session) to pick up new skills."));
    return;
  }

  console.error(c.red(`Unknown command: "${cmd}"`));
  printHelp();
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(c.red("Unexpected error: " + (err?.stack || err)));
    process.exitCode = 1;
  })
  .finally(() => {
    closePrompt();
  });
