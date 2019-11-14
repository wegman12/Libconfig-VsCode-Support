/**
 * A text range in the document
*/
export interface Range {
	/**
	 * The start offset of the range. 
	 */
	offset: number;
	/**
	 * The length of the range. Must not be negative.  
	 */
	length: number;
}