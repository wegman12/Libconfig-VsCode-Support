'use strict';

export interface FoldingRangesContext {
	/**
	 * The maximal number of ranges returned.
	 */
	rangeLimit?: number;
	/**
	 * Called when the result was cropped.
	 */
	onRangeLimitExceeded?: (uri: string) => void;
}