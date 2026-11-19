import { RELEASE_DATE, VERSION } from "./version";

export const SITE_URL = "https://files.phake.app";
export const REPOSITORY_URL = "https://github.com/fuongz/file-viewers";
export const RELEASES_URL = `${REPOSITORY_URL}/releases`;
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`;
export const ISSUES_URL = `${REPOSITORY_URL}/issues`;

export const RELEASE_TAG_URL = `${RELEASES_URL}/tag/v${VERSION}`;
export const DMG_FILE = `File.Viewers_${VERSION}_universal.dmg`;
export const DMG_URL = `${RELEASES_URL}/download/v${VERSION}/${DMG_FILE}`;

export const RELEASE_DATE_LABEL = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeZone: "UTC",
}).format(new Date(RELEASE_DATE));

export { RELEASE_DATE, VERSION };
