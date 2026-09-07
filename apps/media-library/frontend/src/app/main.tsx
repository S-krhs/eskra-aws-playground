// In scope: React の起動と root への割り当て
// Out of scope: 画面の組み立て、API の呼び出し、状態管理
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
