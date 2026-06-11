import { createInterface } from "node:readline";

// One persistent readline interface with a line queue. Using rl.question per
// prompt drops buffered input when stdin is piped: the stream keeps flowing,
// so lines that arrive between questions fire 'line' with no listener and are
// lost. A standing 'line' listener that buffers into a queue fixes that, so
// the wizard works both interactively and with piped/scripted input.
let rl = null;
const queue = [];
let pending = null;
let closed = false;

function init() {
  if (rl) return;
  rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    if (pending) {
      const resolve = pending;
      pending = null;
      resolve(line);
    } else {
      queue.push(line);
    }
  });
  rl.on("close", () => {
    closed = true;
    if (pending) {
      const resolve = pending;
      pending = null;
      resolve(null); // null => EOF
    }
  });
}

function ask(question) {
  init();
  process.stdout.write(question);
  return new Promise((resolve) => {
    if (queue.length) resolve(queue.shift());
    else if (closed) resolve(null);
    else pending = resolve;
  }).then((answer) => (answer == null ? "" : answer.trim()));
}

/** Close the shared interface so the process can exit cleanly. */
export function closePrompt() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

/**
 * Numbered multi-select. User types comma/space separated numbers, "all", or
 * blank to accept the default selection. Returns the chosen items.
 *
 * @param {string} title
 * @param {Array<{label:string, hint?:string}>} items
 * @param {number[]} defaultIdx - 0-based indexes selected by default
 */
export async function multiSelect(title, items, defaultIdx = []) {
  console.log(`\n${title}`);
  items.forEach((it, i) => {
    const star = defaultIdx.includes(i) ? "*" : " ";
    const hint = it.hint ? `  \x1b[2m${it.hint}\x1b[0m` : "";
    console.log(`  [${star}] ${i + 1}. ${it.label}${hint}`);
  });

  const def =
    defaultIdx.length === items.length
      ? "all"
      : defaultIdx.map((i) => i + 1).join(",") || "none";

  const raw = await ask(
    `Enter numbers (e.g. 1,3), "all", or press Enter for [${def}]: `
  );

  if (raw === "") {
    return defaultIdx.map((i) => items[i]);
  }
  if (/^all$/i.test(raw)) {
    return items.slice();
  }
  if (/^none$/i.test(raw)) {
    return [];
  }

  const picked = new Set();
  for (const tok of raw.split(/[\s,]+/).filter(Boolean)) {
    const n = Number(tok);
    if (Number.isInteger(n) && n >= 1 && n <= items.length) {
      picked.add(n - 1);
    }
  }
  return [...picked].sort((a, b) => a - b).map((i) => items[i]);
}

/** Yes/no confirm. Default controls the answer on a blank Enter. */
export async function confirm(question, defaultYes = true) {
  const suffix = defaultYes ? "[Y/n]" : "[y/N]";
  const raw = (await ask(`${question} ${suffix} `)).toLowerCase();
  if (raw === "") return defaultYes;
  return raw === "y" || raw === "yes";
}
