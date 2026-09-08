// In scope: writing the API's OpenAPI document to a file for the client generator to read
// Out of scope: defining the routes, generating the client, serving the document
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenApiDocument } from "../app.js";

// The app root, two levels up from backend/dist/scripts
const outputPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../openapi.json",
);

await writeFile(
	outputPath,
	`${JSON.stringify(buildOpenApiDocument(), null, "\t")}\n`,
	"utf8",
);
console.log(`[media-library] OpenAPI を書き出しました: ${outputPath}`);
