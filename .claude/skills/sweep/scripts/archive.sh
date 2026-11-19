#!/usr/bin/env bash
# Move whole files or folders into archive/ for /sweep, without reading them.
#
#   bash .claude/skills/sweep/scripts/archive.sh "<reason>" <path> [<path> ...]
#
# Repo files go to archive/<YYYY-MM-DD>/<original path> (with `git mv` when
# tracked, so history shows a rename) and get a line in archive/INDEX.md.
# Memory files (~/.claude/projects/*/memory/*) go to archive/memory/<date>/,
# which is gitignored so private memory never lands in a commit; their index is
# archive/memory/INDEX.md. Nothing is overwritten. Only destinations are
# printed, never file contents, because Claude must not read the archive.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: archive.sh \"<reason>\" <path> [<path> ...]" >&2
  exit 2
fi

reason="$1"
shift
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
root="$(cd "$root" && pwd -P)"
home="$(cd "$HOME" && pwd -P)"
day="$(date -u +%Y-%m-%d)"
status=0

for src in "$@"; do
  rel=""
  if [ ! -e "$src" ]; then
    echo "skipped (not found): $src" >&2
    status=1
    continue
  fi
  abs="$(cd "$(dirname "$src")" && pwd -P)/$(basename "$src")"

  case "$abs" in
    "$root"/archive | "$root"/archive/*)
      echo "skipped (already archived): $src" >&2
      status=1
      continue
      ;;
    "$root"/*)
      rel="${abs#"$root"/}"
      dest_rel="archive/$day/$rel"
      index="$root/archive/INDEX.md"
      label="$rel"
      ;;
    "$home"/.claude/projects/*/memory/*)
      dest_rel="archive/memory/$day/$(basename "$abs")"
      index="$root/archive/memory/INDEX.md"
      label="memory/$(basename "$abs")"
      ;;
    *)
      echo "refused (outside the repo and the memory folder): $src" >&2
      status=1
      continue
      ;;
  esac

  dest="$root/$dest_rel"
  if [ -e "$dest" ]; then
    echo "refused (destination exists): $dest_rel" >&2
    status=1
    continue
  fi
  mkdir -p "$(dirname "$dest")"

  if [ -n "$rel" ] && [ -n "$(git -C "$root" ls-files -- "$rel")" ]; then
    git -C "$root" mv -- "$rel" "$dest_rel"
  else
    mv -n -- "$abs" "$dest"
  fi

  if [ ! -f "$index" ]; then
    printf '# Archive index\n\nOutdated material moved here by /sweep. Kept for people; Claude is blocked from reading this folder.\n\n' >"$index"
  fi
  printf -- '- %s · `%s` → `%s` · %s\n' "$day" "$label" "$dest_rel" "$reason" >>"$index"
  echo "archived: $label -> $dest_rel"
done

exit "$status"
