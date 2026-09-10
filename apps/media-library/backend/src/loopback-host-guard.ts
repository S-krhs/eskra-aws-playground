// In scope: turning away a request that arrived under a host name this server doesn't answer to
// Out of scope: the cross-origin check on state-changing requests, routing, serving the UI
import type { MiddlewareHandler } from "hono";

// The server binds 127.0.0.1, so a request can only legitimately carry one of these. A name some site
// pointed at 127.0.0.1 itself arrives with that name here, which is what this turns away — the origin
// check alone would let it through, since such a request's origin does match its own host.
const ALLOWED_HOSTNAMES = ["127.0.0.1", "localhost"];

export const loopbackHostGuard: MiddlewareHandler = async (c, next) => {
	// The request URL is built from the Host header, so this is that header with the port taken off
	const { hostname } = new URL(c.req.url);

	if (!ALLOWED_HOSTNAMES.includes(hostname)) {
		return c.json(
			{ message: "このホスト名宛てのリクエストは受け付けません" },
			403,
		);
	}

	await next();
};
