// In scope: creating the client whose response types are derived from the backend's route definitions
// Out of scope: shaping the fetched data, screen state, how an error is shown
import type { ApiType } from "@backend/app.js";
import { hc } from "hono/client";

/** Types are derived from the backend's route definitions, so no response shape is transcribed by hand. */
export const apiClient = hc<ApiType>("/api");
