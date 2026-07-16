// In scope: SST link された resource 値の解決と、未 link・未設定時の日本語エラーへの変換を提供する
// Out of scope: 各 job 固有の設定型の組み立てを行う
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
		// 未 link の resource へのアクセスは SST の Resource proxy が throw する
		linkedValue = resources[resourceName][property];
	} catch {
		throw new Error(`${resourceName} が link されていません。`);
	}

	return linkedValue?.trim() ?? "";
};

/** SST link された secret の値を解決する。未 link・空値はエラーとして扱う。 */
export const requireSecret = (secretName: string): string => {
	const value = readLinkedProperty(secretName, "value");

	if (!value) {
		throw new Error(`${secretName} secret が設定されていません。`);
	}

	return value;
};

/** SST link された resource の URL を解決する。未 link・空値はエラーとして扱う。 */
export const requireLinkedUrl = (resourceName: string): string => {
	const url = readLinkedProperty(resourceName, "url");

	if (!url) {
		throw new Error(`${resourceName} link が設定されていません。`);
	}

	return url;
};
