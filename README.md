# agent-skills

> Installable [agent skills](https://docs.claude.com/en/docs/claude-code/skills) for **Claude Code** & **Codex**. Pick the skills you want, pick where to install them, done. Zero runtime dependencies.

A small `npx` installer that copies skills into your agent's skills directory (`~/.claude/skills`, `~/.codex/skills`, or a project-local `.claude/skills`). Skills are just folders with a `SKILL.md` and supporting files — this repo bundles them and gives people a one-line way to install them.

## Quick start

Run the interactive installer — no install, no clone:

```bash
npx @uxieee/agent-skills
```

You'll be asked which skills to install and where. That's it. Restart your agent (or start a new session) and the skill is available.

> Requires **Node.js 18+**. Prefer to run straight from source? `npx github:uxieee/agent-skills` works too.

## Usage

```bash
# Interactive wizard (recommended)
npx @uxieee/agent-skills

# List available skills
npx @uxieee/agent-skills list

# Install specific skills, non-interactively
npx @uxieee/agent-skills install get-ghl-workflow-json --target claude,codex

# Install everything, overwrite existing, no prompts
npx @uxieee/agent-skills install --all --target claude --force --yes
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

### `create-ghl-workflow`

Build and publish **GoHighLevel / HighLevel** workflows via the internal builder API — the **write** counterpart to `get-ghl-workflow-json`. Runs the full `create → auto-save steps → trigger → publish` sequence, harvesting real UI-created steps to mirror their exact shape (so the steps actually open in the builder).

- **This skill writes to your GHL account.** It is draft-first by design — it builds and verifies everything as a draft and requires explicit confirmation before the publish step — but it is not read-only. Only install it if you intend to create workflows programmatically.
- **Requires:** Node 18+ (bundled `.js` callers use native `fetch`). ID discovery (form / custom-field / contact IDs) uses the GHL public MCP if available.
- Triggers when you ask an agent to create/build/publish a HighLevel workflow or add a trigger/action/step via the API.

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

These skills automate real accounts. `get-ghl-workflow-json` is read-only by design and throttled. `create-ghl-workflow` **writes** to your account (draft-first, with a confirmation gate before publishing) — treat it accordingly. Both drive GHL's undocumented internal API, which is off-ToS; you are responsible for how you use them on accounts you have authorization to access. Review a skill's `SKILL.md` before installing it.

## License

[MIT](./LICENSE) © Xander Roque
