// In scope: the folder and kind filter controls
// Out of scope: fetching the listing, showing the results, starting a sync
import { useRef, useState } from "react";
import type { MediaFilter } from "@/entities/media";

// Long enough that a folder name is typed out before the listing is asked for again
const FOLDER_COMMIT_DELAY_MS = 300;

const KINDS = [
	{ label: "すべて", value: "" },
	{ label: "画像", value: "image/" },
	{ label: "動画", value: "video/" },
] as const;

/** Changing anything here restarts the listing from the top. */
export const MediaFilterBar = ({
	filter,
	onChange,
}: {
	filter: MediaFilter;
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
