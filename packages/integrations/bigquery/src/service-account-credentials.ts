// In scope: validating and converting a GCP service-account key JSON into BigQuery client credentials
// Out of scope: resolving where the key comes from, calling the BigQuery API
import { z } from "zod";

export interface BigQueryServiceAccountCredentials {
	projectId: string;
	clientEmail: string;
	privateKey: string;
}

const serviceAccountKeySchema = z.object({
	project_id: z.string().min(1),
	client_email: z.string().min(1),
	private_key: z.string().min(1),
});

/** Never includes validation detail in the thrown error, so the key's contents can't leak through it. */
export const parseServiceAccountKey = (
	serviceAccountKey: string,
): BigQueryServiceAccountCredentials => {
	let parsedKey: unknown;
	try {
		parsedKey = JSON.parse(serviceAccountKey);
	} catch {
		throw new Error("GCP サービスアカウント鍵を JSON として解釈できません。");
	}

	const result = serviceAccountKeySchema.safeParse(parsedKey);
	if (!result.success) {
		throw new Error(
			"GCP サービスアカウント鍵に project_id・client_email・private_key が揃っていません。",
		);
	}

	return {
		projectId: result.data.project_id,
		clientEmail: result.data.client_email,
		privateKey: result.data.private_key,
	};
};
