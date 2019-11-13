'use strict';

export enum SyntaxKind {
	OpenBraceToken = 1,
	CloseBraceToken = 2,
	OpenParenToken = 3,
	CloseParenToken = 4,
	OpenBracketToken = 5,
	CloseBracketToken = 6,
	CommaToken = 7,
	ColonToken = 8,
	EqualToken = 9,
	SemicolonToken = 10,
	TrueKeyword = 11,
	FalseKeyword = 12,
	StringLiteral = 13,
	NumericLiteral = 14,
	PropertyName = 15,
	LineCommentTrivia = 16,
	BlockCommentTrivia = 17,
	LineBreakTrivia = 18,
	Trivia = 19,
	Unknown = 20,
	EOF = 21
}
