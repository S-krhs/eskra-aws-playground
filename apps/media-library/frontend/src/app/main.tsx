// In scope: bootstrapping React, providing the query client, and mounting on root
// Out of scope: assembling the screen, calling the API, state
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MediaLibraryPage } from "@/pages/media-library";
import { queryClient } from "@/shared/api";
import "@/shared/styles/index.css";

const root = document.getElementById("root");

if (!root) {
	throw new Error("root 要素が見つかりません");
}

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<MediaLibraryPage />
		</QueryClientProvider>
	</StrictMode>,
);
