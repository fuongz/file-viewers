#!/usr/bin/env bash
# scripts/release.sh — bump version, tag, and push
#
# Usage:
#   ./scripts/release.sh           # auto-increment patch  (1.2.3 → 1.2.4)
#   ./scripts/release.sh patch     # same as above
#   ./scripts/release.sh minor     # bump minor            (1.2.3 → 1.3.0)
#   ./scripts/release.sh major     # bump major            (1.2.3 → 2.0.0)
#   ./scripts/release.sh 1.5.0     # use exact version

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_CONF="$ROOT/src-tauri/tauri.conf.json"
CARGO_TOML="$ROOT/src-tauri/Cargo.toml"
PKG_JSON="$ROOT/package.json"

# ── helpers ────────────────────────────────────────────────────────────────

die() { echo "error: $*" >&2; exit 1; }

require() {
  for cmd in "$@"; do
    command -v "$cmd" &>/dev/null || die "'$cmd' not found — please install it"
  done
}

# Increment a semver component
bump() {
  local version="$1" part="$2"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$version"
  case "$part" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
  esac
}

# ── preflight ──────────────────────────────────────────────────────────────

require git jq sed

cd "$ROOT"

# Must be on main and clean
current_branch=$(git rev-parse --abbrev-ref HEAD)
[[ "$current_branch" == "main" ]] || die "must be on branch 'main' (currently '$current_branch')"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "working tree has uncommitted changes — commit or stash first"
fi

# Sync tags from remote
echo "→ fetching tags from origin…"
git fetch --tags --quiet

# ── determine current and next version ────────────────────────────────────

# Latest semver tag (strip leading 'v')
latest_tag=$(git tag --sort=-v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
if [[ -z "$latest_tag" ]]; then
  current_version="0.0.0"
else
  current_version="${latest_tag#v}"
fi

arg="${1:-patch}"

case "$arg" in
  major|minor|patch)
    next_version=$(bump "$current_version" "$arg")
    ;;
  [0-9]*\.[0-9]*\.[0-9]*)
    next_version="$arg"
    ;;
  *)
    die "invalid argument '$arg'. Use: major | minor | patch | X.Y.Z"
    ;;
esac

next_tag="v${next_version}"

# Check tag doesn't already exist
if git tag | grep -qx "$next_tag"; then
  die "tag '$next_tag' already exists"
fi

echo "  current : ${latest_tag:-<none>} (${current_version})"
echo "  next    : ${next_tag} (${next_version})"
echo ""

# ── update version files ───────────────────────────────────────────────────

echo "→ updating package.json…"
tmp=$(mktemp)
jq --arg v "$next_version" '.version = $v' "$PKG_JSON" > "$tmp" && mv "$tmp" "$PKG_JSON"

echo "→ updating src-tauri/tauri.conf.json…"
tmp=$(mktemp)
jq --arg v "$next_version" '.version = $v' "$TAURI_CONF" > "$tmp" && mv "$tmp" "$TAURI_CONF"

echo "→ updating src-tauri/Cargo.toml…"
# Replace the first `version = "..."` line in [package] section only
sed -i '' "0,/^version = \"[^\"]*\"/{s/^version = \"[^\"]*\"/version = \"${next_version}\"/}" "$CARGO_TOML"

# ── commit, tag, push ──────────────────────────────────────────────────────

echo "→ committing version bump…"
git add "$PKG_JSON" "$TAURI_CONF" "$CARGO_TOML"
git commit -m "chore: release ${next_tag}"

echo "→ tagging ${next_tag}…"
git tag "$next_tag"

echo ""
echo "Ready to push. Run:"
echo ""
echo "  git push origin main ${next_tag}"
echo ""
read -r -p "Push now? [y/N] " confirm
if [[ "${confirm,,}" == "y" ]]; then
  git push origin main "$next_tag"
  echo "✓ pushed — create a GitHub Release from ${next_tag} to trigger the CI build."
else
  echo "Skipped push. Run the command above when ready."
fi
