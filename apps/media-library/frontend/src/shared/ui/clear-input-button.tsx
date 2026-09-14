// In scope: the button that empties the text field it sits beside
// Out of scope: whether the field has anything to clear, what emptying it means

/**
 * Sits inside a daisyUI `label.input`, after its field.
 * Pressing it leaves focus in the field: a field that hands its value over on blur would otherwise hand
 * over what was typed just before this empties it.
 */
export const ClearInputButton = ({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) => {
	return (
		<button
			type="button"
			aria-label={label}
			onMouseDown={(event) => {
				event.preventDefault();
			}}
			onClick={onClick}
			className="btn btn-ghost btn-xs btn-circle text-base-content/60"
		>
			✕
		</button>
	);
};
