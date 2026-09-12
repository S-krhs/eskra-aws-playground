// In scope: turning the folder operation's result into a response
// Out of scope: registering the route, reading the DB, the shape of what comes back
import type { RouteHandler } from "@hono/zod-openapi";
import { listFoldersOperation } from "./operations/list-folders-operation.js";
import type { listFoldersRoute } from "./schema.js";

export const listFolders: RouteHandler<typeof listFoldersRoute> = async (c) => {
	const result = await listFoldersOperation();

	return c.json(result.data, 200);
};
