/**
 * Error codes used by diagnostics
 */
export enum ErrorCode {
	Undefined = 0,
	EnumValueMismatch = 1,
	UnexpectedEndOfComment = 0x101,
	UnexpectedEndOfString = 0x102,
	UnexpectedEndOfNumber = 0x103,
	InvalidUnicode = 0x104,
	InvalidEscapeCharacter = 0x105,
	InvalidCharacter = 0x106,
	PropertyExpected = 0x201,
	CommaExpected = 0x202,
	ColonExpected = 0x203,
	ValueExpected = 0x204,
	CommaOrCloseBacketExpected = 0x205,
	CommaOrCloseBraceExpected = 0x206,
	TrailingComma = 0x207,
	DuplicateKey = 0x208,
	CommentNotPermitted = 0x209,
	SemicolonExpected = 0x300
}