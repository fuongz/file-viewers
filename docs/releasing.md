# Releasing File Viewers

## Prepare a release

Run the checks from the repository root before setting a release version.

```sh
bun install --frozen-lockfile
bun run typecheck
bun run --filter @apps/desktop build
bun run --filter @apps/landing build
cargo test --manifest-path apps/desktop-app/src-tauri/Cargo.toml --locked --lib
```

On a clean `main`, use [`scripts/release.sh`](../scripts/release.sh) with `patch`, `minor`, `major`, or an explicit `X.Y.Z`. The script updates the desktop package, Tauri configuration, Cargo manifest, lockfiles, and landing page version metadata. It creates a version commit and tag locally, then prompts before pushing.

Push the version commit and tag, then create and publish a GitHub Release for that tag. Publishing triggers the [Release workflow](../.github/workflows/release.yml). Expect a short delay before the assets appear because the workflow runs after publication.

## CI signing and outputs

Set `TAURI_SIGNING_PRIVATE_KEY` as a GitHub Actions secret and set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key has a password. The key must match the updater public key in [`tauri.conf.json`](../apps/desktop-app/src-tauri/tauri.conf.json). The release workflow uses [`tauri.release.conf.json`](../apps/desktop-app/src-tauri/tauri.release.conf.json) to enable signed updater assets.

### macOS signing

Every public macOS release must use the project's Apple Developer account to sign the app with a **Developer ID Application** certificate and submit it to Apple for notarization. Before publishing, configure `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` in GitHub Actions. `APPLE_PASSWORD` is an app-specific password for notarization.

The workflow falls back to an unsigned build if `APPLE_CERTIFICATE` is absent. Treat that result as a failed release verification and correct the signing configuration before distributing the DMG. Apple code signing and the Tauri updater signature are both required for the public macOS release.

| Target | Installers | Updater assets |
| --- | --- | --- |
| macOS universal | DMG | Signed app archive for Apple Silicon and Intel |
| Linux x86_64 | DEB, AppImage, RPM | Signed packages |
| Windows x86_64 | MSI, NSIS EXE | Signed installers |

CI updates a shared `latest.json` in sequence across platforms. The final `verify-updater` job checks that the manifest version matches the tag and that the required entries have HTTPS URLs and signatures.

## Verify availability

1. Confirm the Release workflow succeeded, including `verify-updater`.
2. Check that the [latest manifest](https://github.com/fuongz/file-viewers/releases/latest/download/latest.json) and installers are present.
3. On macOS, mount the DMG and verify the app with `codesign --verify --deep --strict` and `spctl --assess --type execute --verbose`, passing the path to the mounted `.app` to each command.
4. From a previous supported release, use **File Viewers → Check for Updates…** and confirm that the new version is offered. Check again on the new version to confirm the up-to-date response.
5. Deploy the landing page and check its download links. See the [landing guide](../apps/landing/README.md).
