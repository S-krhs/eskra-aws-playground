// In scope: the type of the conditions narrowing the listing
// Out of scope: operating the filter, fetching the listing, display
import type { ListMediaState } from "@/shared/api";

/**
 * The listing's filter conditions; an omitted field narrows nothing.
 * Both the feature producing them and the feature fetching the listing use this, so it lives in entities.
 */
export interface MediaFilter {
	logicalPath?: string;
	contentTypePrefix?: string;
	tag?: string;
	/** Which of the three sides to read; omitted reads the library. */
	state?: ListMediaState;
}
