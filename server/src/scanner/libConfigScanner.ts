'use strict';
import { SyntaxKind, ScanError } from '../dataClasses';

/**
 * The scanner object, representing a JSON scanner at a position in the input string.
 */
export interface LibConfigScanner {
	/**
	 * Sets the scan position to a new offset. A call to 'scan' is needed to get the first token.
	 */
	setPosition(pos: number): void;
	/**
	 * Read the next token. Returns the token code.
	 */
	scan(): SyntaxKind;
	/**
	 * Returns the current scan position, which is after the last read token.
	 */
	getPosition(): number;
	/**
	 * Returns the last read token.
	 */
	getToken(): SyntaxKind;
	/**
	 * Returns the last read token value. The value for strings is the decoded string content. For numbers it's of type number, for boolean it's true or false.
	 */
	getTokenValue(): string;
	/**
	 * The start offset of the last read token.
	 */
	getTokenOffset(): number;
	/**
	 * The length of the last read token.
	 */
	getTokenLength(): number;
	/**
	 * The zero-based start line number of the last read token.
	 */
	getTokenStartLine(): number;
	/**
	 * The zero-based start character (column) of the last read token.
	 */
	getTokenStartCharacter(): number;
	/**
	 * An error code of the last scan.
	 */
	getTokenError(): ScanError;
}