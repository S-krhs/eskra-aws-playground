// In scope: the folder, kind and tag filter controls
// Out of scope: fetching the listing, showing the results, starting a sync
import { useRef, useState } from "react";
import type { MediaFilter } from "@/entities/media";
import type { ListMediaState, TagUsage } from "@/shared/api";
import { useTagFilter } from "../model/use-tag-filter.js";

// Long enough that a folder name is typed out before the listing is asked for again
const FOLDER_COMMIT_DELAY_MS = 300;

const STATES = [
	{ label: "未整理", value: "inbox" },
	{ label: "ライブラリ", value: "filed" },
	{ label: "ゴミ箱", value: "trashed" },
] as const;

const KINDS = [
	{ label: "すべて", value: "" },
	{ label: "画像", value: "image/" },
	{ label: "動画", value: "video/" },
] as const;

/** Changing anything here restarts the listing from the top. */
export const MediaFilterBar = ({
	filter,
	tags,
	folders,
	onChange,
}: {
	filter: MediaFilter;
	tags: TagUsage[];
	/** The folders there are, offered as completions for the folder field. */
	folders: string[];
	/**
	 * The folder field hands its value over on a delay, by which time a button may have changed another
	 * part of the filter — a copy captured back when the key was pressed would put that choice back.
	 */
	onChange: (update: (filter: MediaFilter) => MediaFilter) => void;
}) => {
	// The field holds what is being typed and hands it over once it settles, so every keystroke doesn't
	// become a query key of its own and blank the grid on the way past
	const [folder, setFolder] = useState(filter.logicalPath ?? "");
	const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const tagFilter = useTagFilter({ tags, filter, onChange });
	const commitFolder = (value: string) => {
		clearTimeout(commitTimer.current);
		onChange((current) => {
			return { ...current, logicalPath: value || undefined };
		});
	};
	const selectState = (value: ListMediaState) => {
		if (value === "inbox") {
			// The inbox side has no folder to be in, so a commit still waiting would put one back
			clearTimeout(commitTimer.current);
			setFolder("");
			onChange((current) => {
				return { ...current, state: value, logicalPath: undefined };
			});
			return;
		}

		onChange((current) => {
			return { ...current, state: value };
		});
	};

	return (
		// Wraps as a row while the screen is narrow, and stacks once it is the sidebar's column
		<div className="flex flex-wrap items-end gap-x-4 gap-y-3 md:flex-col md:flex-nowrap md:items-stretch md:gap-5">
			<fieldset>
				<legend className="mb-1.5 font-medium text-base-content/60 text-xs">
					表示
				</legend>
				<div className="join md:join-vertical md:w-full">
					{STATES.map((state) => {
						const isActive = (filter.state ?? "filed") === state.value;

						return (
							<button
								key={state.value}
								type="button"
								aria-pressed={isActive}
								onClick={() => {
									selectState(state.value);
								}}
								className={`btn join-item btn-sm ${isActive ? "btn-primary" : ""}`}
							>
								{state.label}
							</button>
						);
					})}
				</div>
			</fieldset>

			<fieldset>
				<legend className="mb-1.5 font-medium text-base-content/60 text-xs">
					種別
				</legend>
				<div className="join md:w-full">
					{KINDS.map((kind) => {
						const isActive = (filter.contentTypePrefix ?? "") === kind.value;

						return (
							<button
								key={kind.label}
								type="button"
								aria-pressed={isActive}
								onClick={() => {
									onChange((current) => {
										return {
											...current,
											contentTypePrefix: kind.value || undefined,
										};
									});
								}}
								className={`btn join-item btn-sm md:flex-1 ${isActive ? "btn-primary" : ""}`}
							>
								{kind.label}
							</button>
						);
					})}
				</div>
			</fieldset>

			{filter.state === "inbox" ? null : (
				<fieldset>
					<legend className="mb-1.5 font-medium text-base-content/60 text-xs">
						フォルダ
					</legend>
					<label className="input input-sm w-48 pe-1 md:w-full">
						<input
							type="text"
							list="media-filter-folders"
							aria-label="フォルダ"
							value={folder}
							placeholder="例: photos/2024"
							onChange={(event) => {
								const { value } = event.target;
								setFolder(value);
								clearTimeout(commitTimer.current);
								commitTimer.current = setTimeout(() => {
									commitFolder(value);
								}, FOLDER_COMMIT_DELAY_MS);
							}}
							onBlur={(event) => {
								commitFolder(event.target.value);
							}}
						/>
						{folder === "" ? null : (
							<button
								type="button"
								aria-label="フォルダの入力を消す"
								onClick={() => {
									setFolder("");
									commitFolder("");
								}}
								className="btn btn-ghost btn-xs btn-circle text-base-content/60"
							>
								✕
							</button>
						)}
					</label>
					<datalist id="media-filter-folders">
						{folders.map((path) => {
							return <option key={path} value={path} />;
						})}
					</datalist>
				</fieldset>
			)}

			<fieldset className="basis-full md:basis-auto">
				{/* The clear link shares the legend's line so it appearing doesn't push the buttons down */}
				<legend className="mb-1.5 flex w-full items-center justify-between font-medium text-base-content/60 text-xs">
					タグ
					{tagFilter.selectedTags.length === 0 ? null : (
						<button
							type="button"
							onClick={tagFilter.clear}
							className="link link-hover font-normal"
						>
							{tagFilter.selectedTags.length} 件の選択を解除
						</button>
					)}
				</legend>
				<div className="flex flex-col gap-2.5">
					<label className="input input-sm w-full pe-1 sm:w-64 md:w-full">
						<input
							type="search"
							aria-label="タグを検索"
							placeholder="タグを検索"
							value={tagFilter.query}
							onChange={(event) => {
								tagFilter.setQuery(event.target.value);
							}}
						/>
						{tagFilter.query === "" ? null : (
							<button
								type="button"
								aria-label="タグの検索を消す"
								onClick={() => {
									tagFilter.setQuery("");
								}}
								className="btn btn-ghost btn-xs btn-circle text-base-content/60"
							>
								✕
							</button>
						)}
					</label>
					{tagFilter.offeredTags.length === 0 ? (
						<p className="px-1 text-base-content/50 text-xs">
							{tags.length === 0
								? "付いているタグはありません"
								: "一致するタグはありません"}
						</p>
					) : (
						// Capped while it sits above the grid, so a long list doesn't push the media off the screen;
						// the sidebar scrolls as a whole instead
						<div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto md:max-h-none md:overflow-visible">
							{tagFilter.offeredTags.map((tag) => {
								const isSelected = tagFilter.selectedTags.includes(tag.name);

								return (
									<button
										key={tag.name}
										type="button"
										aria-pressed={isSelected}
										onClick={() => {
											tagFilter.toggle(tag.name);
										}}
										className={`btn btn-sm h-7 max-w-full gap-1 rounded-full px-3 font-normal ${isSelected ? "btn-primary" : "border-base-300 bg-base-100"}`}
									>
										<span className="truncate">{tag.name}</span>
										<span className="opacity-60">({tag.mediaCount})</span>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</fieldset>
		</div>
	);
};
