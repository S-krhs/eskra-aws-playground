// In scope: the input/output types of the MediaTag repository
// Out of scope: validation schemas, DB access, what a tag means to a screen

/** One tag. It exists only while at least one media object carries it. */
export interface MediaTag {
	id: number;
	name: string;
}

/** A tag with how many media objects carry it, trashed ones and ones still in the inbox included. */
export interface MediaTagUsage extends MediaTag {
	mediaCount: number;
}
