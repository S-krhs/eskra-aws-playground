// In scope: 論理パスと種別の絞り込み操作
// Out of scope: 一覧の取得、絞り込み結果の表示、同期の起動
import type { MediaFilter } from "@/entities/media";

const KINDS = [
	{ label: "すべて", value: "" },
	{ label: "画像", value: "image/" },
	{ label: "動画", value: "video/" },
] as const;

/** 絞り込みの操作。変更のたびに一覧は先頭から取り直しになる。 */
export const MediaFilterBar = ({
	filter,
	onChange,
}: {
	filter: MediaFilter;
	onChange: (filter: MediaFilter) => void;
}) => {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<label className="flex items-center gap-1 text-sm">
				<span className="text-slate-500">フォルダ</span>
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
					className="w-48 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
				/>
			</label>

			<div className="flex overflow-hidden rounded border border-slate-300 dark:border-slate-700">
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
							className={`px-3 py-1 text-sm ${
								isActive
									? "bg-teal-700 text-white"
									: "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
							}`}
						>
							{kind.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};
