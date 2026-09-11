// In scope: the folder and kind filter controls
// Out of scope: fetching the listing, showing the results, starting a sync
import { useRef, useState } from "react";
import type { MediaFilter } from "@/entities/media";

// Long enough that a folder name is typed out before the listing is asked for again
const FOLDER_COMMIT_DELAY_MS = 300;

const STATES = [
	{ label: "ライブラリ", value: "active" },
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
	/** The tags there are to narrow by; the caller reads them. */
	tags: string[];
	/** The folders there are, offered as completions for the folder field. */
	folders: string[];
	onChange: (filter: MediaFilter) => void;
}) => {
	// The field holds what is being typed and hands it over once it settles, so every keystroke doesn't
	// become a query key of its own and blank the grid on the way past
	const [folder, setFolder] = useState(filter.logicalPath ?? "");
	const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const commitFolder = (value: string) => {
		clearTimeout(commitTimer.current);
		onChange({ ...filter, logicalPath: value || undefined });
	};

	return (
		<div className="flex flex-wrap items-center gap-3">
			<fieldset className="fieldset">
				<legend className="fieldset-legend py-0">フォルダ</legend>
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
					className="input input-sm w-48"
				/>
				<datalist id="media-filter-folders">
					{folders.map((path) => {
						return <option key={path} value={path} />;
					})}
				</datalist>
			</fieldset>

			<fieldset className="fieldset">
				<legend className="fieldset-legend py-0">タグ</legend>
				<select
					aria-label="タグ"
					value={filter.tag ?? ""}
					onChange={(event) => {
						onChange({ ...filter, tag: event.target.value || undefined });
					}}
					className="select select-sm w-36"
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
			</fieldset>

			<fieldset className="fieldset">
				<legend className="fieldset-legend py-0">表示</legend>
				<div className="join">
					{STATES.map((state) => {
						const isActive = (filter.state ?? "active") === state.value;

						return (
							<button
								key={state.value}
								type="button"
								aria-pressed={isActive}
								onClick={() => {
									onChange({ ...filter, state: state.value });
								}}
								className={`btn join-item btn-sm ${isActive ? "btn-primary" : ""}`}
							>
								{state.label}
							</button>
						);
					})}
				</div>
			</fieldset>

			<fieldset className="fieldset">
				<legend className="fieldset-legend py-0">種別</legend>
				<div className="join">
					{KINDS.map((kind) => {
						const isActive = (filter.contentTypePrefix ?? "") === kind.value;

						return (
							<button
								key={kind.label}
								type="button"
								aria-pressed={isActive}
								onClick={() => {
									onChange({
										...filter,
										contentTypePrefix: kind.value || undefined,
									});
								}}
								className={`btn join-item btn-sm ${isActive ? "btn-primary" : ""}`}
							>
								{kind.label}
							</button>
						);
					})}
				</div>
			</fieldset>
		</div>
	);
};
