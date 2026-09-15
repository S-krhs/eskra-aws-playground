// In scope: the line naming the archive folder that is open, and the way back to the folder list
// Out of scope: deciding which folder is open, listing what it holds
export const ArchiveFolderHeader = ({
	logicalPath,
	onBack,
}: {
	logicalPath: string;
	onBack: () => void;
}) => {
	return (
		<div className="flex shrink-0 items-center gap-2 border-base-300 border-b bg-base-100 px-3 py-2">
			<button
				type="button"
				onClick={onBack}
				className="btn btn-ghost btn-sm rounded-full"
			>
				← フォルダ一覧
			</button>
			<h2 className="min-w-0 truncate font-medium text-sm" title={logicalPath}>
				{logicalPath}
			</h2>
		</div>
	);
};
