#!/bin/sh
set -eu

mode=${1:-regular}
if [ "$#" -gt 1 ] || { [ "$mode" != regular ] && [ "$mode" != deep ]; }; then
	printf '%s\n' 'Usage: mise run clean [deep] or mise run clean:deep' >&2
	exit 1
fi

root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd -P)
cd "$root"

remove_generated() {
	for path do
		[ -e "$path" ] || [ -L "$path" ] || continue
		parent=$(CDPATH='' cd -- "$(dirname -- "$path")" && pwd -P)
		case "$parent/" in
			"$root/"*)
				rm -rf -- "$path"
				printf 'Removed %s\n' "$path"
				;;
			*) printf 'Skipped path outside the workspace: %s\n' "$path" >&2 ;;
		esac
	done
}

remove_generated \
	apps/desktop-app/dist \
	apps/desktop-app/dist-ssr \
	apps/desktop-app/src-tauri/target \
	apps/desktop-app/tsconfig.node.tsbuildinfo \
	apps/landing/dist \
	apps/landing/dist-ssr \
	apps/landing/.tanstack \
	apps/landing/.wrangler/tmp \
	apps/landing/.wrangler/deploy \
	apps/landing/.output \
	apps/landing/.nitro \
	apps/landing/.vinxi

if [ "$mode" = deep ]; then
	remove_generated node_modules apps/desktop-app/node_modules apps/landing/node_modules
else
	for dependencies in node_modules apps/desktop-app/node_modules apps/landing/node_modules; do
		[ ! -L "$dependencies" ] || continue
		remove_generated "$dependencies/.cache" "$dependencies/.vite" "$dependencies/.vite-temp"
	done
fi
