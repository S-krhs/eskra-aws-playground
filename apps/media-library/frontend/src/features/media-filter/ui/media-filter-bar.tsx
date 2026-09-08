// In scope: the folder and kind filter controls
// Out of scope: fetching the listing, showing the results, starting a sync
import type { MediaFilter } from "@/entities/media";

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
	return (
		<div className="flex flex-wrap items-center gap-3">
			<fieldset className="fieldset">
				<legend className="fieldset-legend py-0">フォルダ</legend>
				<input
					type="text"
					value={filter.logicalPath ?? ""}
					placeholder="_inbox"
					onChange={(event) => {
						onChange({
							...filter,
							logicalPath: event.target.value || undefined,
						});
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
