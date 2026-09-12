// In scope: the folder and kind filter controls
// Out of scope: fetching the listing, showing the results, starting a sync
import { useRef, useState } from "react";
import type { MediaFilter } from "@/entities/media";
import type { ListMediaState } from "@/shared/api";

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
	tags: string[];
	/** The folders there are, offered as completions for the folder field. */
	folders: string[];
	/**
	 * Takes what the filter should become from what it currently is. The folder field hands its value
	 * over on a delay, by which time a button may have changed another part of the filter, and a copy
	 * captured back when the key was pressed would put that choice back.
	 */
	onChange: (update: (filter: MediaFilter) => MediaFilter) => void;
}) => {
	// The field holds what is being typed and hands it over once it settles, so every keystroke doesn't
	// become a query key of its own and blank the grid on the way past
	const [folder, setFolder] = useState(filter.logicalPath ?? "");
	const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
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
		<div className="flex flex-wrap items-end gap-x-4 gap-y-3 md:flex-col md:flex-nowrap md:items-stretch md:gap-4">
			<fieldset>
				<legend className="mb-1 font-medium text-base-content/60 text-xs">
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
				<legend className="mb-1 font-medium text-base-content/60 text-xs">
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
				<>
					<label className="flex flex-col gap-1">
						<span className="font-medium text-base-content/60 text-xs">
							フォルダ
						</span>
						<input
							type="text"
							list="media-filter-folders"
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
							className="input input-sm w-48 md:w-full"
						/>
					</label>
					<datalist id="media-filter-folders">
						{folders.map((path) => {
							return <option key={path} value={path} />;
						})}
					</datalist>
				</>
			)}

			<label className="flex flex-col gap-1">
				<span className="font-medium text-base-content/60 text-xs">タグ</span>
				<select
					value={filter.tag ?? ""}
					onChange={(event) => {
						const { value } = event.target;

						onChange((current) => {
							return { ...current, tag: value || undefined };
						});
					}}
					className="select select-sm w-36 md:w-full"
				>
					<option value="">すべて</option>
					{tags.map((tag) => {
						return (
							<option key={tag} value={tag}>
								{tag}
							</option>
						);
					})}
				</select>
			</label>
		</div>
	);
};
