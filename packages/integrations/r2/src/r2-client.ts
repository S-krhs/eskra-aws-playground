// In scope: creating a client for R2's S3-compatible endpoint, wire-parsing credentials
// Out of scope: resolving where credentials come from, deciding the bucket name, object operations
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

export interface R2Credentials {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
}

export type R2Client = S3Client;

const r2CredentialsSchema = z.object({
	accountId: z.string().min(1),
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
});

/** A validation failure names only the bad field(s), never the values, so a key can't leak through it. */
export const parseR2Credentials = (value: unknown): R2Credentials => {
	const result = r2CredentialsSchema.safeParse(value);

	if (!result.success) {
		const fields = result.error.issues
			.map((issue) => {
				return issue.path.join(".");
			})
			.join(", ");

		throw new Error(`R2 の認証情報が不正です: ${fields}`);
	}

	return result.data;
};

/**
 * Converts the JSON string a secret actually holds into R2 credentials.
 * `JSON.parse`'s `SyntaxError` embeds the start of the input in its message —
 * left unhandled, that leaks the secret into the caller's logs — so a syntax
 * failure gets swapped for our own error here.
 */
export const parseR2CredentialsJson = (json: string): R2Credentials => {
	let parsed: unknown;

	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error("R2 の認証情報を JSON として解釈できません。");
	}

	return parseR2Credentials(parsed);
};

export const createR2Client = (credentials: R2Credentials): R2Client => {
	return new S3Client({
		region: "auto",
		endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
		},
		// Default WHEN_SUPPORTED adds a checksum header R2 doesn't understand — restrict to when required
		requestChecksumCalculation: "WHEN_REQUIRED",
		responseChecksumValidation: "WHEN_REQUIRED",
	});
};
