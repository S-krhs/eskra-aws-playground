// In scope: resolving a file extension to the content type it is stored under
// Out of scope: the allowlist itself, inspecting a file's actual content, key construction, talking to R2
import { CONTENT_TYPES } from "./schema.js";

/** Returns undefined for an unlisted extension — the caller skips that file. */
export const resolveContentType = (extension: string): string | undefined => {
	return CONTENT_TYPES[extension.replace(/^\./, "").toLowerCase()];
};
