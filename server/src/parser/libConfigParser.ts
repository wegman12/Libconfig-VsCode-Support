'use strict';

import {
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	Range
} from 'vscode-languageserver';
import {
	CreateDefaultScanner
} from '../scanner/impl/generateScanner';
import {
	ScanError,
	LibConfigDocument,
	SyntaxKind,
	ErrorCode,
	SettingKind
} from '../dataClasses';
import * as nls from 'vscode-nls';
import {
	LibConfigScanner
} from '../scanner/libConfigScanner';

const localize = nls.loadMessageBundle();

export function ParseLibConfigDocument(textDocument: TextDocument): LibConfigDocument {

	let problems: Diagnostic[] = [];
	let lastProblemOffset: number = -1;
	let text: string = textDocument.getText();
	let scanner: LibConfigScanner = CreateDefaultScanner(text, false);
	let commentRanges: Range[] = [];

	function _scanNext(): SyntaxKind {
		while (true) {
			let token = scanner.scan();
			_checkScanError();
			switch (token) {
				case SyntaxKind.LineCommentTrivia:
				case SyntaxKind.BlockCommentTrivia:
					if (Array.isArray(commentRanges)) {
						commentRanges.push(Range.create(textDocument.positionAt(scanner.getTokenOffset()), textDocument.positionAt(scanner.getTokenOffset() + scanner.getTokenLength())));
					}
					break;
				case SyntaxKind.Trivia:
				case SyntaxKind.LineBreakTrivia:
					break;
				default:
					return token;
			}
		}
	}

	function _parseSetting() {
		if (scanner.getToken() !== SyntaxKind.PropertyName) {
			_error(
				localize('ExpectedProperty', "Expected a property value name"),
				ErrorCode.PropertyExpected,
				[SyntaxKind.SemicolonToken]);
			return;
		}
		let token = _scanNext();
		if (token !== SyntaxKind.EqualToken && token !== SyntaxKind.ColonToken) {
			_error(
				localize('ExpectedSetter', 'Expected a colon or equal'),
				ErrorCode.ColonExpected,
				[SyntaxKind.SemicolonToken]
			);
			return;
		}
		_parseValue();
		_parseTerminator();
	}

	function _parseValue(scan : boolean = true): SettingKind {
		let token = scan ? _scanNext() : scanner.getToken();
		switch (token) {
			case SyntaxKind.OpenBraceToken:
				// Parse Group
				_parseGroup();
				return SettingKind.Group;
			case SyntaxKind.OpenParenToken:
				// Parse List
				_parseList();
				return SettingKind.List;
			case SyntaxKind.OpenBracketToken:
				// Parse Array
				_parseArray();
				return SettingKind.Array;
			case SyntaxKind.NumericLiteral:
				return SettingKind.Number;
			case SyntaxKind.TrueKeyword:
			case SyntaxKind.FalseKeyword:
				return SettingKind.Number;
			case SyntaxKind.StringLiteral:
				return SettingKind.String;
			default:
				_error(
					localize('UnrecognizedType', 'Expected setting type kind value'),
					ErrorCode.ValueExpected,
					[],
					[SyntaxKind.SemicolonToken]
				);
				return SettingKind.Invalid;
		}
	}

	function _parseGroup() {
		// Move to next token
		_scanNext();
		while (
			scanner.getToken() !== SyntaxKind.CloseBraceToken &&
			scanner.getToken() !== SyntaxKind.EOF
			) {
			_parseSetting();
		}
	}

	function _parseList() {
		// Move to next token
		_scanNext();
		if (scanner.getToken() === SyntaxKind.CloseParenToken) {
			return;
		}

		_parseValue(false);

		let nextToken = _scanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseParenToken &&
			scanner.getToken() !== SyntaxKind.EOF
		) {
			if (nextToken !== SyntaxKind.CommaToken) {
				_error(
					localize('CommaExpected', 'Expected a comma'),
					ErrorCode.CommaExpected,
					[SyntaxKind.CloseParenToken, SyntaxKind.CommaToken]
				);
				continue;
			}
			_parseValue();
			nextToken = _scanNext();
		}
	}

	function _parseArray() {
		// Move to next token
		_scanNext();
		if (scanner.getToken() === SyntaxKind.CloseBracketToken) {
			return;
		}

		let validateValue = (value: SettingKind) => {
			switch (firstKind) {
				case SettingKind.Number:
				case SettingKind.Boolean:
				case SettingKind.String:
					break;
				default:
					_error(
						localize('InvalidArrayEntry', 'Array entries must be scalar values'),
						ErrorCode.ValueExpected
					);
			}
		};

		let firstKind = _parseValue(false);
		validateValue(firstKind);
		let nextToken = _scanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseBracketToken &&
			scanner.getToken() !== SyntaxKind.EOF
		) {
			if (nextToken !== SyntaxKind.CommaToken) {
				_error(
					localize('CommaExpected', 'Expected a comma'),
					ErrorCode.CommaExpected,
					[SyntaxKind.CloseBracketToken],
					[SyntaxKind.CommaToken]
				);
				continue;
			}
			let secondKind = _parseValue();
			validateValue(secondKind);
			if (firstKind === SettingKind.Invalid) {
				firstKind = secondKind;
			}
			if (firstKind !== secondKind) {
				_error(
					localize('MismatchArrayType', 'Array entries must all have the same type'),
					ErrorCode.ValueExpected
				);
			}
			nextToken = _scanNext();
		}
	}

	function _parseTerminator() {
		if (_scanNext() !== SyntaxKind.SemicolonToken) {
			_error(
				localize('ExpectedSemicolon', 'Expected a terminator'),
				ErrorCode.SemicolonExpected,
				[SyntaxKind.SemicolonToken, SyntaxKind.LineBreakTrivia]
			);
			return;
		}
		// Move to next
		_scanNext();
	}

	function _errorAtRange(message: string, code: ErrorCode, startOffset: number, endOffset: number, severity: DiagnosticSeverity = DiagnosticSeverity.Error): void {

		if (problems.length === 0 || startOffset !== lastProblemOffset) {
			let range = Range.create(textDocument.positionAt(startOffset), textDocument.positionAt(endOffset));
			problems.push(Diagnostic.create(range, message, severity, code, textDocument.languageId));
			lastProblemOffset = startOffset;
		}
	}

	function _error(message: string, code: ErrorCode, skipUntilAfter: SyntaxKind[] = [], skipUntil: SyntaxKind[] = []) {
		let start = scanner.getTokenOffset();
		let end = scanner.getTokenOffset() + scanner.getTokenLength();
		if (start === end && start > 0) {
			start--;
			while (start > 0 && /\s/.test(text.charAt(start))) {
				start--;
			}
			end = start + 1;
		}
		_errorAtRange(message, code, start, end);

		if (skipUntilAfter.length + skipUntil.length > 0) {
			let token = scanner.getToken();
			while (token !== SyntaxKind.EOF) {
				if (skipUntilAfter.indexOf(token) !== -1) {
					_scanNext();
					break;
				} else if (skipUntil.indexOf(token) !== -1) {
					break;
				}
				token = _scanNext();
			}
		}
	}

	function _checkScanError(): boolean {
		switch (scanner.getTokenError()) {
			case ScanError.InvalidUnicode:
				_error(localize('InvalidUnicode', 'Invalid unicode sequence in string.'), ErrorCode.InvalidUnicode);
				return true;
			case ScanError.InvalidEscapeCharacter:
				_error(localize('InvalidEscapeCharacter', 'Invalid escape character in string.'), ErrorCode.InvalidEscapeCharacter);
				return true;
			case ScanError.UnexpectedEndOfNumber:
				_error(localize('UnexpectedEndOfNumber', 'Unexpected end of number.'), ErrorCode.UnexpectedEndOfNumber);
				return true;
			case ScanError.UnexpectedEndOfComment:
				_error(localize('UnexpectedEndOfComment', 'Unexpected end of comment.'), ErrorCode.UnexpectedEndOfComment);
				return true;
			case ScanError.UnexpectedEndOfString:
				_error(localize('UnexpectedEndOfString', 'Unexpected end of string.'), ErrorCode.UnexpectedEndOfString);
				return true;
			case ScanError.InvalidCharacter:
				_error(localize('InvalidCharacter', 'Invalid characters in string. Control characters must be escaped.'), ErrorCode.InvalidCharacter);
				return true;
		}
		return false;
	}

	_scanNext();
	while (scanner.getToken() !== SyntaxKind.EOF) {
		_parseSetting();
	}
	return new LibConfigDocument(problems, commentRanges);
}