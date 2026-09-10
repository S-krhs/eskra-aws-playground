// In scope: the intermediate result type an operation returns inside a route
// Out of scope: Discord protocol payloads, the HTTP response, business rules

/** An operation's result; anything other than OK is handled explicitly by the route. */
export type OperationResult<T, E extends { kind: string } = never> =
	| { kind: "OK"; data: T }
	| E;
