// In scope: the fields the uploader needs out of the shared config file
// Out of scope: reading the file itself, deciding what the values are used for, talking to R2, creating the file
import { loadJsonConfigFile } from "@eskra-aws-playground/libs/config/json-config-file.js";
import { z } from "zod";

const CONFIG_PATH_ENV = "MEDIA_LIBRARY_CONFIG";

// r2 is left unvalidated here — repositories owns what a credential has to look like
const configSchema = z.object({
	bucket: z.string().min(1),
	r2: z.unknown(),
});

export type MediaUploadConfig = z.infer<typeof configSchema>;

/**
 * Reads the fields the uploader needs out of the shared config file. The file's location comes from
 * infra/local/, which every launch route sets, so there is no default here.
 */
export const loadConfigFile = async (): Promise<MediaUploadConfig> => {
	return loadJsonConfigFile({ envName: CONFIG_PATH_ENV, schema: configSchema });
};
