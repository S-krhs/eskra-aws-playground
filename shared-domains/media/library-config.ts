// In scope: the convention for where the media library's config file lives
// Out of scope: loading the config file, validating its fields, building a connection from it
import { homedir } from "node:os";
import { join } from "node:path";

export const MEDIA_LIBRARY_CONFIG_ENV = "MEDIA_LIBRARY_CONFIG";

const DEFAULT_CONFIG_PATH = join(
	homedir(),
	".config",
	"eskra-media-library",
	"config.json",
);

/** Decided in this one place so the uploader and the management tool read the same file. */
export const resolveMediaLibraryConfigPath = (): string => {
	return process.env[MEDIA_LIBRARY_CONFIG_ENV] ?? DEFAULT_CONFIG_PATH;
};
