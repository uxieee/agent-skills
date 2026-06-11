# agent-skills

> Installable [agent skills](https://docs.claude.com/en/docs/claude-code/skills) for **Claude Code** & **Codex**. Pick the skills you want, pick where to install them, done. Zero runtime dependencies.

A small `npx` installer that copies skills into your agent's skills directory (`~/.claude/skills`, `~/.codex/skills`, or a project-local `.claude/skills`). Skills are just folders with a `SKILL.md` and supporting files — this repo bundles them and gives people a one-line way to install them.

## Quick start

Run the interactive installer — no install, no clone:

```bash
npx github:uxieee/agent-skills
```

You'll be asked which skills to install and where. That's it. Restart your agent (or start a new session) and the skill is available.

> Requires **Node.js 18+**.

## Usage

```bash
# Interactive wizard (recommended)
npx github:uxieee/agent-skills

# List available skills
npx github:uxieee/agent-skills list

# Install specific skills, non-interactively
npx github:uxieee/agent-skills install get-ghl-workflow-json --target claude,codex

# Install everything, overwrite existing, no prompts
npx github:uxieee/agent-skills install --all --target claude --force --yes
```

### Install options

| Flag | Description |
|---|---|
| `--target <ids>` | Where to install: `claude`, `codex`, `project` (comma-separated). Default: `claude` |
| `--all` | Install every available skill |
| `--force` | Overwrite skills that are already installed |
| `-y`, `--yes` | Skip the confirmation prompt |

### Targets

| Target | Installs to |
|---|---|
| `claude` | `~/.claude/skills/` |
| `codex` | `~/.codex/skills/` |
| `project` | `./.claude/skills/` (current directory — check a skill into a specific repo) |

## Available skills

### `get-ghl-workflow-json`

Capture, export, and validate **GoHighLevel / HighLevel** workflow JSON from the workflow builder's read-only internal endpoints. Uses your own logged-in browser session (JWT interception), human-paced throttling, and **read-only `GET` requests only** — it never writes to your GHL account.

- **Requires:** `python3` on your PATH (for the bundled throttle + validation scripts).
- Triggers when you ask an agent to get/download/export/inspect a HighLevel workflow's JSON, or paste an `app.gohighlevel.com` workflow URL.

## How it works

Each skill is a self-contained folder under [`skills/`](./skills). The installer reads [`skills.json`](./skills.json) (the registry), copies the selected skill folder into the target directory, and preserves executable bits on any `.py` / `.sh` helpers. No files outside the chosen skills directory are touched. Nothing runs at install time except the copy.

## Adding a new skill

1. Drop your skill folder in `skills/<your-skill-id>/` with a valid `SKILL.md` (YAML frontmatter `name` + `description`).
2. Add an entry to `skills.json`:
   ```json
   {
     "id": "your-skill-id",
     "name": "Your Skill",
     "version": "1.0.0",
     "summary": "One-line description shown in the installer.",
     "dir": "your-skill-id",
     "tags": ["..."],
     "requires": []
   }
   ```
3. Avoid hardcoding absolute paths inside the skill — it can be installed under `~/.claude`, `~/.codex`, or a project dir. Reference bundled scripts relative to the skill directory.
4. `npx github:uxieee/agent-skills list` to confirm it shows up.

## Safety

These skills automate real accounts. `get-ghl-workflow-json` is read-only by design and throttled, but you are responsible for how you use it on accounts you have authorization to access. Review a skill's `SKILL.md` before installing it.

## License

[MIT](./LICENSE) © Xander Roque
