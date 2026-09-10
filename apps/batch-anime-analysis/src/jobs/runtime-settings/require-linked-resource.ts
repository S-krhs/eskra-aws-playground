// In scope: resolving an SST-linked resource value and turning an unlinked or unset one into a Japanese error
// Out of scope: assembling each job's own settings type
import { Resource } from "sst/resource";

const readLinkedProperty = (
	resourceName: string,
	property: "value" | "url",
): string => {
	let linkedValue: string | undefined;

	try {
		const resources = Resource as unknown as Record<
			string,
			Record<string, string | undefined>
		>;
		// SST's Resource proxy throws on access to an unlinked resource
		linkedValue = resources[resourceName][property];
	} catch {
		throw new Error(`${resourceName} が link されていません。`);
	}

	return linkedValue?.trim() ?? "";
};

/** Resolves an SST-linked secret; unlinked or empty is an error. */
export const requireSecret = (secretName: string): string => {
	const value = readLinkedProperty(secretName, "value");

	if (!value) {
		throw new Error(`${secretName} secret が設定されていません。`);
	}

	return value;
};

/** Resolves an SST-linked resource's URL; unlinked or empty is an error. */
export const requireLinkedUrl = (resourceName: string): string => {
	const url = readLinkedProperty(resourceName, "url");

	if (!url) {
		throw new Error(`${resourceName} link が設定されていません。`);
	}

	return url;
};
