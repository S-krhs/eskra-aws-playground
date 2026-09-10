// In scope: the type of the conditions narrowing the listing
// Out of scope: operating the filter, fetching the listing, display

/**
 * The listing's filter conditions; an omitted field narrows nothing.
 * Both the feature producing them and the feature fetching the listing use this, so it lives in entities.
 */
export interface MediaFilter {
	logicalPath?: string;
	contentTypePrefix?: string;
}
