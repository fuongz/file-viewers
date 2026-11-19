#!/bin/sh
set -eu

if [ "$(uname -s)" != Darwin ]; then
	printf '%s\n' 'app:install requires macOS.' >&2
	exit 1
fi

if [ ! -w /Applications ]; then
	printf '%s\n' 'Your account needs write access to /Applications.' >&2
	exit 1
fi

target=$(rustc -vV | sed -n 's/^host: //p')
target_dir=$(cargo metadata --manifest-path src-tauri/Cargo.toml --format-version 1 --no-deps |
	bun -e 'console.log(JSON.parse(await Bun.stdin.text()).target_directory)')
name="File Viewers.app"
bundle="$target_dir/$target/release/bundle/macos/$name"
destination="/Applications/$name"

bun run tauri build --target "$target" --bundles app
if [ ! -d "$bundle" ]; then
	printf 'App bundle missing at %s\n' "$bundle" >&2
	exit 1
fi

staging=$(mktemp -d /Applications/.file-viewers.XXXXXX)
backup="$staging/previous.app"
cleanup() {
	if { [ -e "$backup" ] || [ -L "$backup" ]; } &&
		[ ! -e "$destination" ] && [ ! -L "$destination" ]; then
		mv "$backup" "$destination" || {
			printf 'Previous app is backed up at %s\n' "$backup" >&2
			return
		}
	fi
	rm -rf "$staging"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

/usr/bin/ditto "$bundle" "$staging/$name"
if [ -e "$destination" ] || [ -L "$destination" ]; then
	mv "$destination" "$backup"
fi
mv "$staging/$name" "$destination"
printf 'Installed %s\n' "$destination"
