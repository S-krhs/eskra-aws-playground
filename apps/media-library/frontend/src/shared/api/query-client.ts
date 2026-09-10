// In scope: the one QueryClient the screen shares
// Out of scope: the queries themselves, the generated client, rendering
import { QueryClient } from "@tanstack/react-query";

/**
 * A local tool talking to a server on the same machine, so a refetch is cheap.
 * Retrying a failed request only delays the error the user needs to see.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, refetchOnWindowFocus: false },
	},
});
