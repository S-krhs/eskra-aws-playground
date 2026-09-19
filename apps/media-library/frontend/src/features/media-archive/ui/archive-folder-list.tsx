// In scope: searching the archive's folders by name and opening one
// Out of scope: reading the folders there are, holding the search, listing what a folder holds
import { ClearInputButton } from "@/shared/ui";

const FOLDER_ICON =
	"M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z";

/**
 * The archive is browsed by folder rather than by media: a backup is found by the name it was put away
 * under, so the search matches any part of a folder's path. `query` is held by the caller, so it is still
 * there on coming back out of a folder.
 */
export const ArchiveFolderList = ({
	folders,
	query,
	onQueryChange,
	onOpen,
}: {
	folders: string[];
	query: string;
	onQueryChange: (query: string) => void;
	onOpen: (logicalPath: string) => void;
}) => {
	const needle = query.trim().toLowerCase();
	const matched = folders.filter((path) => {
		return path.toLowerCase().includes(needle);
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-base-300 border-b bg-base-100 px-3 py-2">
				<label className="input input-sm w-full pe-1 sm:w-80">
					<input
						type="text"
						aria-label="フォルダ名で検索"
						placeholder="フォルダ名で検索"
						value={query}
						onChange={(event) => {
							onQueryChange(event.target.value);
						}}
					/>
					{query === "" ? null : (
						<ClearInputButton
							label="フォルダの検索を消す"
							onClick={() => {
								onQueryChange("");
							}}
						/>
					)}
				</label>
				<p className="text-base-content/60 text-xs">
					{matched.length} / {folders.length} フォルダ
				</p>
			</div>

			{matched.length === 0 ? (
				<p className="px-3 py-10 text-center text-base-content/60 text-sm">
					{folders.length === 0
						? "アーカイブしたフォルダはありません"
						: "一致するフォルダはありません"}
				</p>
			) : (
				<ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2 overflow-y-auto p-3">
					{matched.map((path) => {
						return (
							<li key={path}>
								<button
									type="button"
									title={path}
									onClick={() => {
										onOpen(path);
									}}
									className="btn h-auto min-h-11 w-full justify-start gap-2.5 border-base-300 bg-base-100 px-3 py-2 font-normal"
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={1.8}
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
										className="size-4 shrink-0 text-base-content/60"
									>
										<path d={FOLDER_ICON} />
									</svg>
									<span className="truncate">{path}</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
};
