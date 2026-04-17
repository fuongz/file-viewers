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
TAURI_CONF="$ROOT/desktop-app/src-tauri/tauri.conf.json"
CARGO_TOML="$ROOT/desktop-app/src-tauri/Cargo.toml"
PKG_JSON="$ROOT/desktop-app/package.json"
VERSION_TS="$ROOT/landing/src/version.ts"

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

require git jq sed gh

cd "$ROOT"

# Must have gh write access to releases
gh auth status &>/dev/null || die "not authenticated — run: gh auth login"
repo_push=$(gh api repos/fuongz/file-viewers --jq '.permissions.push' 2>/dev/null || echo "false")
[[ "$repo_push" == "true" ]] || die "gh token lacks push access — re-auth with: gh auth refresh -s repo"

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

echo "→ updating desktop-app/package.json…"
tmp=$(mktemp)
jq --arg v "$next_version" '.version = $v' "$PKG_JSON" > "$tmp" && mv "$tmp" "$PKG_JSON"

echo "→ updating desktop-app/src-tauri/tauri.conf.json…"
tmp=$(mktemp)
jq --arg v "$next_version" '.version = $v' "$TAURI_CONF" > "$tmp" && mv "$tmp" "$TAURI_CONF"

echo "→ updating desktop-app/src-tauri/Cargo.toml…"
# Replace the first `version = "..."` line in [package] section only
perl -i -0pe "s/^version = \"[^\"]*\"/version = \"${next_version}\"/" "$CARGO_TOML"

echo "→ updating landing/src/version.ts…"
release_date=$(date +%Y-%m-%d)
sed -i '' 's/export const VERSION = ".*"/export const VERSION = "'"$next_version"'"/' "$VERSION_TS"
sed -i '' 's/export const RELEASE_DATE = ".*"/export const RELEASE_DATE = "'"$release_date"'"/' "$VERSION_TS"

# ── commit, tag, push ──────────────────────────────────────────────────────

echo "→ committing version bump…"
git add "$PKG_JSON" "$TAURI_CONF" "$CARGO_TOML" "$VERSION_TS"
git commit -m "chore: release ${next_tag}"

echo "→ tagging ${next_tag}…"
git tag "$next_tag"

echo ""
echo "Ready to push. Run:"
echo ""
echo "  git push origin main ${next_tag}"
echo ""
read -r -p "Push now? [y/N] " confirm
if [[ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" == "y" ]]; then
  git push origin main "$next_tag"
  echo "→ creating GitHub Release ${next_tag}…"
  gh release create "$next_tag" \
    --title "$next_tag" \
    --generate-notes \
    --draft
  echo "✓ Draft release created — review notes then publish to trigger CI build."
  echo "  https://github.com/fuongz/file-viewers/releases"
else
  echo "Skipped push. Run the command above when ready."
fi
