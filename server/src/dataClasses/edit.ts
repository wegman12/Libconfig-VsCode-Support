/**
 * Represents a text modification
 */
export interface Edit {
	/**
	 * The start offset of the modification.
	 */
	offset: number;
	/**
	 * The length of the modification. Must not be negative. Empty length represents an *insert*.
	 */
	length: number;
	/**
	 * The new content. Empty content represents a *remove*.
	 */
	content: string;
}