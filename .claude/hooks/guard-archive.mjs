#!/usr/bin/env node
/**
 * PreToolUse guard for /sweep's archive (`archive/` at the repo root).
 *
 * Archived notes are kept for people, not for Claude: they are outdated by
 * definition and would mislead an agent that read them. This hook refuses any
 * tool call that would read them, while still letting files be moved in:
 *
 * - Read / Edit / NotebookEdit / Grep / Glob on a path inside archive/ → denied.
 * - Write into archive/ → allowed only for a new file (no read-back, no overwrite).
 * - Bash → denied when the command names a path inside archive/, reads an older
 *   version of a file that now lives in the archive (`git show rev:path`), or
 *   runs a whole-tree search that would walk into it (grep -r, git grep without
 *   a pathspec, rg --no-ignore, find -exec, `**` globs).
 * - `.claude/skills/sweep/scripts/archive.sh` is the sanctioned way to move
 *   files in; it never prints file contents.
 *
 * The Grep/Glob tools and ripgrep already skip archive/ through `.ignore`.
 * On an unexpected internal error the hook allows the call rather than
 * blocking every tool (fail-open), so keep it simple and tested.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = realish(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const ARCHIVE = path.join(ROOT, "archive");
const HELPER = ".claude/skills/sweep/scripts/archive.sh";

function realish(p) {
  // Resolve symlinks on the longest existing prefix, so new files resolve too.
  let cur = path.resolve(p);
  const rest = [];
  while (!fs.existsSync(cur)) {
    const parent = path.dirname(cur);
    if (parent === cur) break;
    rest.unshift(path.basename(cur));
    cur = parent;
  }
  try {
    cur = fs.realpathSync(cur);
  } catch {}
  return path.join(cur, ...rest);
}

// macOS file systems are usually case-insensitive, so compare lower-cased.
function inArchive(p, base) {
  if (!p || typeof p !== "string") return false;
  const abs = realish(path.resolve(base, expandHome(p))).toLowerCase();
  const arch = ARCHIVE.toLowerCase();
  return abs === arch || abs.startsWith(arch + path.sep);
}

function expandHome(p) {
  return p === "~" || p.startsWith("~/") ? path.join(process.env.HOME || "", p.slice(1)) : p;
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `${reason} The archive/ folder holds outdated material that /sweep moved out of the way; it is off-limits to Claude. Work from the current files and git history instead.`,
      },
    }),
  );
  process.exit(0);
}

// Dated snapshot folders, e.g. archive/2026-11-16/specs/tickets/06-…/rd.md
function archivedCopyExists(rel) {
  if (!rel || path.isAbsolute(rel) || rel.startsWith("..")) return false;
  let dirs = [];
  try {
    dirs = fs.readdirSync(ARCHIVE).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  } catch {
    return false;
  }
  const clean = path.normalize(rel).replace(/\/+$/, "");
  return dirs.some((d) => fs.existsSync(path.join(ARCHIVE, d, clean)));
}

function checkPathTool(tool, input, cwd) {
  const p = input.file_path ?? input.notebook_path ?? input.path;
  if (tool === "Write") {
    if (inArchive(p, cwd) && fs.existsSync(path.resolve(cwd, p))) {
      deny("Overwriting a file in archive/ is blocked.");
    }
    return;
  }
  if (inArchive(p, cwd)) deny(`${tool} on a path inside archive/ is blocked.`);

  if (tool === "Glob" || tool === "Grep") {
    const base = input.path ? path.resolve(cwd, input.path) : cwd;
    const pattern = tool === "Glob" ? input.pattern : input.glob;
    if (typeof pattern === "string" && pattern) {
      if (pattern.split("/").some((seg) => seg.toLowerCase() === "archive")) {
        deny(`${tool} pattern targets archive/.`);
      }
      const staticPrefix = pattern.split(/[*?[{]/)[0];
      if (staticPrefix && inArchive(staticPrefix, base)) deny(`${tool} pattern targets archive/.`);
    }
  }
}

function checkBash(command, cwd) {
  const cmd = String(command || "");

  // The sanctioned mover, run on its own (no chaining, pipes or redirects).
  const helperCall = new RegExp(
    String.raw`^\s*(bash\s+)?("?\$CLAUDE_PROJECT_DIR"?/|\./)?` + HELPER.replace(/[.]/g, "\\.") + String.raw`(\s|$)`,
  );
  if (helperCall.test(cmd) && !/[;&|<>`]|\$\(/.test(cmd.replace(/"[^"]*"|'[^']*'/g, ""))) return;

  // Drop text that is data rather than paths: heredoc bodies and -m messages.
  const scrubbed = cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2(?=\s|$)/g, " ")
    .replace(/(^|\s)(-m|--message)(\s+|=)("(?:[^"\\]|\\.)*"|'[^']*')/g, " ");

  if (/\bgit\s+(-C\s+\S+\s+)?grep\b/.test(scrubbed) && !/\s--\s+\S/.test(scrubbed)) {
    deny("`git grep` without a pathspec would search archive/. Use the Grep tool, or pass paths after `--`.");
  }
  if (/(^|[\s;&|(])(e|f)?grep\b[^;&|]*?(\s-[a-zA-Z]*[rR][a-zA-Z]*\b|\s--(recursive|dereference-recursive)\b)/.test(scrubbed)) {
    deny("Recursive grep would walk into archive/. Use the Grep tool, which skips it.");
  }
  if (/(^|[\s;&|(])rg\b[^;&|]*?(\s-u+\b|\s--no-ignore\b|\s--unrestricted\b)/.test(scrubbed)) {
    deny("ripgrep without ignore files would search archive/. Use the Grep tool.");
  }
  if (/(^|[\s;&|(])find\b[^;&|]*?\s-(exec|execdir|ok|okdir)\b/.test(scrubbed)) {
    deny("`find -exec` can read files inside archive/. Use the Glob and Grep tools instead.");
  }

  const tokens = scrubbed
    .split(/[\s;&|()<>`]+|\$\(/)
    .map((t) => t.replace(/^['"]+|['"]+$/g, "").replace(/["']/g, ""))
    .filter(Boolean);

  for (const token of tokens) {
    if (/^(\.\/)?\*\*|^\*\//.test(token)) {
      deny("A repo-wide `**` or `*/` glob would expand into archive/. Name the folders you need instead.");
    }
    const parts = new Set([token]);
    for (const sep of ["=", ":"]) {
      for (const piece of token.split(sep)) if (piece) parts.add(piece);
    }
    for (const part of parts) {
      if (part.startsWith("-") || /^[a-z]+:\/\//i.test(part)) continue;
      if (inArchive(part, cwd)) deny("This command names a path inside archive/.");
      const abs = path.resolve(cwd, part);
      if (!fs.existsSync(abs) && archivedCopyExists(path.relative(ROOT, realish(abs)))) {
        deny(`\`${part}\` was archived; its old versions in git history are off-limits too.`);
      }
    }
  }
}

try {
  const raw = fs.readFileSync(0, "utf8");
  const input = raw ? JSON.parse(raw) : {};
  const tool = input.tool_name;
  const toolInput = input.tool_input || {};
  const cwd = input.cwd || ROOT;

  if (tool === "Bash" || tool === "PowerShell") checkBash(toolInput.command, cwd);
  else if (["Read", "Edit", "Write", "NotebookEdit", "Grep", "Glob"].includes(tool)) {
    checkPathTool(tool, toolInput, cwd);
  }
} catch (err) {
  process.stderr.write(`guard-archive: ${err?.message || err}\n`);
}
process.exit(0);
