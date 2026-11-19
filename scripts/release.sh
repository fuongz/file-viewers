#!/usr/bin/env bash
# scripts/release.sh - prepare a version commit and tag, then offer to push
#
# Usage:
#   ./scripts/release.sh           # auto-increment patch  (1.2.3 => 1.2.4)
#   ./scripts/release.sh patch     # same as above
#   ./scripts/release.sh minor     # bump minor            (1.2.3 => 1.3.0)
#   ./scripts/release.sh major     # bump major            (1.2.3 => 2.0.0)
#   ./scripts/release.sh 1.5.0     # use exact version

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_CONF="$ROOT/apps/desktop-app/src-tauri/tauri.conf.json"
CARGO_TOML="$ROOT/apps/desktop-app/src-tauri/Cargo.toml"
CARGO_LOCK="$ROOT/apps/desktop-app/src-tauri/Cargo.lock"
PKG_JSON="$ROOT/apps/desktop-app/package.json"
VERSION_TS="$ROOT/apps/landing/src/version.ts"
BUN_LOCK="$ROOT/bun.lock"

# ── helpers ────────────────────────────────────────────────────────────────

die() { echo "error: $*" >&2; exit 1; }

require() {
  for cmd in "$@"; do
    command -v "$cmd" &>/dev/null || die "'$cmd' not found - please install it"
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

require git jq perl cargo bun

cd "$ROOT"

# Must be on main and clean
current_branch=$(git rev-parse --abbrev-ref HEAD)
[[ "$current_branch" == "main" ]] || die "must be on branch 'main' (currently '$current_branch')"

if [[ -n "$(git status --porcelain)" ]]; then
  die "working tree has uncommitted changes — commit or stash first"
fi

# Sync tags from remote
echo "=> fetching tags from origin..."
git fetch --tags --quiet

# ── determine current and next version ────────────────────────────────────

# Latest semver tag (strip leading 'v')
latest_tag=$(git tag --sort=-v:refname | awk '/^v?[0-9]+\.[0-9]+\.[0-9]+$/ && !found { print; found = 1 }')
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
[[ "$next_version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] ||
  die "expected a version in X.Y.Z format"

# Check tag doesn't already exist
if git tag | grep -qx "$next_tag"; then
  die "tag '$next_tag' already exists"
fi

echo "  current : ${latest_tag:-<none>} (${current_version})"
echo "  next    : ${next_tag} (${next_version})"
echo ""

# ── update version files ───────────────────────────────────────────────────

echo "=> updating apps/desktop-app/package.json..."
tmp=$(mktemp)
jq --indent 2 --arg v "$next_version" '.version = $v' "$PKG_JSON" > "$tmp" && mv "$tmp" "$PKG_JSON"

echo "=> updating apps/desktop-app/src-tauri/tauri.conf.json..."
tmp=$(mktemp)
jq --tab --arg v "$next_version" '.version = $v' "$TAURI_CONF" > "$tmp" && mv "$tmp" "$TAURI_CONF"

echo "=> updating apps/desktop-app/src-tauri/Cargo.toml..."
# Replace the first `version = "..."` line in [package] section only
RELEASE_VERSION="$next_version" perl -i -0pe 's/^(\[package\]\n[^\[]*?^version = ")[^"]+/${1}$ENV{RELEASE_VERSION}/m
  or die "Cannot find the Cargo package version\n"' "$CARGO_TOML"

echo "=> updating apps/landing/src/version.ts..."
release_date=$(date +%Y-%m-%d)
perl -pi -e "s/^export const VERSION = \"[^\"]*\"/export const VERSION = \"${next_version}\"/; s/^export const RELEASE_DATE = \"[^\"]*\"/export const RELEASE_DATE = \"${release_date}\"/" "$VERSION_TS"

echo "=> updating the Bun and Cargo lockfiles..."
# Bun can leave the workspace version untouched on a version-only change.
RELEASE_VERSION="$next_version" perl -i -0pe 's/^(    "apps\/desktop-app": \{\n      "name": "\@apps\/desktop",\n      "version": ")[^"]+/${1}$ENV{RELEASE_VERSION}/m
  or die "Cannot find the Bun desktop workspace version\n"' "$BUN_LOCK"
bun install --frozen-lockfile --lockfile-only --ignore-scripts
cargo update --manifest-path "$CARGO_TOML" --workspace

# ── commit, tag, push ──────────────────────────────────────────────────────

echo "=> committing version bump..."
git add "$PKG_JSON" "$TAURI_CONF" "$CARGO_TOML" "$CARGO_LOCK" "$VERSION_TS" "$BUN_LOCK"
git commit -m "chore: release ${next_tag}"

echo "=> tagging ${next_tag}..."
git tag "$next_tag"

echo ""
echo "Ready to push. Run:"
echo ""
echo "  git push origin main ${next_tag}"
echo ""
read -r -p "Push now? [y/N] " confirm
if [[ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" == "y" ]]; then
  git push origin main "$next_tag"
  echo "[x] Pushed. Tag ${next_tag} is live."
else
  echo "Skipped push. Run the command above when ready."
fi
