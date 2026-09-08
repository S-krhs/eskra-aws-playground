// In scope: creating the R2 client and resolving its credentials and bucket, reusing one instance across invocations
// Out of scope: object operations, key construction, where the environment's values come from
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

let client: S3Client | undefined;

const credentialsSchema = z.object({
	accountId: z.string().min(1),
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
});

/**
 * Turns the JSON string an API token is held as into credentials.
 * `JSON.parse`'s `SyntaxError` embeds the start of the input in its message — left unhandled, that
 * leaks the credentials into the caller's logs — so both failures get our own error, naming at most
 * which fields were wrong.
 */
export const parseR2Credentials = (
	json: string,
): z.infer<typeof credentialsSchema> => {
	let parsed: unknown;

	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error("R2 の認証情報を JSON として解釈できません。");
	}

	const result = credentialsSchema.safeParse(parsed);

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

/** Resolved from R2_CREDENTIALS (the JSON an API token is held as); throws without attempting a connection when it is unset. */
export const getR2Client = (): S3Client => {
	if (client) {
		return client;
	}

	const credentialsJson = process.env.R2_CREDENTIALS;
	if (!credentialsJson) {
		throw new Error(
			"R2_CREDENTIALS が設定されていません。R2 の API token を JSON で設定してください。",
		);
	}

	const credentials = parseR2Credentials(credentialsJson);

	client = new S3Client({
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

	return client;
};

export const getMediaBucket = (): string => {
	const bucket = process.env.MEDIA_BUCKET;
	if (!bucket) {
		throw new Error("MEDIA_BUCKET が設定されていません。");
	}

	return bucket;
};
