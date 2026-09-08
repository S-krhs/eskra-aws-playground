// In scope: bootstrapping React and mounting it on root
// Out of scope: assembling the screen, calling the API, state
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MediaLibraryPage } from "@/pages/media-library";
import "@/shared/styles/index.css";

const root = document.getElementById("root");

if (!root) {
	throw new Error("root 要素が見つかりません");
}

createRoot(root).render(
	<StrictMode>
		<MediaLibraryPage />
	</StrictMode>,
);
