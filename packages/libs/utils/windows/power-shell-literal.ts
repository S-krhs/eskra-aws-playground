// In scope: turning a value into a PowerShell string literal
// Out of scope: running PowerShell, building a command, what the value means

/**
 * A single-quoted literal, with the quote itself doubled — the form PowerShell interpolates nothing
 * into. A value that reaches a command unquoted is read as syntax.
 */
export const toPowerShellLiteral = (value: string): string => {
	return `'${value.replaceAll("'", "''")}'`;
};
