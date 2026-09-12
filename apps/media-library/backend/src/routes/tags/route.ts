// In scope: turning the tag operation's result into a response
// Out of scope: registering the route, reading the DB, the shape of what comes back
import type { RouteHandler } from "@hono/zod-openapi";
import { listTagsOperation } from "./operations/list-tags-operation.js";
import type { listTagsRoute } from "./schema.js";

export const listTags: RouteHandler<typeof listTagsRoute> = async (c) => {
	const result = await listTagsOperation();

	return c.json(result.data, 200);
};
