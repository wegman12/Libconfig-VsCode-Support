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
	SettingKind,
	LibConfigPropertyNode,
	BaseLibConfigNode,
	NumberLibConfigNodeImpl,
	LibConfigPropertyNodeImpl,
	BooelanLibConfigNodeImpl,
	StringLibConfigNodeImpl,
	ObjectLibConfigNode,
	ObjectLibConfigNodeImpl,
	ListLibConfigNode,
	ArrayLibConfigNode,
	ListLibConfigNodeImpl,
	ScalarLibConfigNodeImpl,
	BaseLibConfigNodeImpl,
	ScalarLibConfigNode,
	ArrayLibConfigNodeImpl
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

	function _parseSetting(
		parent: ObjectLibConfigNode | LibConfigPropertyNode | null) : LibConfigPropertyNode | undefined {
		if (scanner.getToken() !== SyntaxKind.PropertyName) {
			_error(
				localize('ExpectedProperty', "Expected a property value name"),
				ErrorCode.PropertyExpected,
				[SyntaxKind.SemicolonToken]);
			return;
		}

		let setting = new LibConfigPropertyNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			scanner.getTokenValue(), 
			null
		);
		let token = _scanNext();
		if (token !== SyntaxKind.EqualToken && token !== SyntaxKind.ColonToken) {
			_error(
				localize('ExpectedSetter', 'Expected a colon or equal'),
				ErrorCode.ColonExpected,
				[SyntaxKind.SemicolonToken]
			);
			setting.length = scanner.getPosition() - setting.offset;
			return setting;
		}
		setting.value = _parseValue(setting);
		setting.length = scanner.getPosition() - setting.offset;
		_parseTerminator();

		return setting;
	}

	function _parseValue(
		parent: LibConfigPropertyNode | ListLibConfigNode,
		scan: boolean = true
	):
		BaseLibConfigNode | null {
		let token = scan ? _scanNext() : scanner.getToken();
		switch (token) {
			case SyntaxKind.OpenBraceToken:
				// Parse Group
				return _parseGroup(parent);
			case SyntaxKind.OpenParenToken:
				// Parse List
				return _parseList(parent);
			case SyntaxKind.OpenBracketToken:
				// Parse Array
				return _parseArray(parent);
			case SyntaxKind.NumericLiteral:
				return new NumberLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					parseFloat(scanner.getTokenValue())
				);
			case SyntaxKind.TrueKeyword:
			case SyntaxKind.FalseKeyword:
				return new BooelanLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					scanner.getTokenValue().toLowerCase() === 'true'
				);	
			case SyntaxKind.StringLiteral:
				return new StringLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					scanner.getTokenValue()
				);	
			default:
				_error(
					localize('UnrecognizedType', 'Expected setting type kind value'),
					ErrorCode.ValueExpected,
					[],
					[SyntaxKind.SemicolonToken]
				);
				return null;
		}
	}

	function _parseScalarValue(
		parent: LibConfigPropertyNode | ArrayLibConfigNode,
		scan: boolean = true
	):
		ScalarLibConfigNode | undefined {
		let token = scan ? _scanNext() : scanner.getToken();
		switch (token) {
			case SyntaxKind.NumericLiteral:
				return new NumberLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					parseFloat(scanner.getTokenValue())
				);
			case SyntaxKind.TrueKeyword:
			case SyntaxKind.FalseKeyword:
				return new BooelanLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					scanner.getTokenValue().toLowerCase() === 'true'
				);	
			case SyntaxKind.StringLiteral:
				return new StringLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					scanner.getTokenValue()
				);	
			default:
				_error(
					localize('UnrecognizedType', 'Expected setting type kind value'),
					ErrorCode.ValueExpected,
					[],
					[SyntaxKind.SemicolonToken]
				);
				return;
		}
	}

	function _parseGroup(parent: LibConfigPropertyNode | ListLibConfigNode) : ObjectLibConfigNode {
		let back = new ObjectLibConfigNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			[]
		);
		// Move to next token
		_scanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseBraceToken &&
			scanner.getToken() !== SyntaxKind.EOF
		) {
			let setting = _parseSetting(back);
			if(setting)
				back.addChild(setting);
		}
		back.length = scanner.getPosition() - back.offset;
		return back;
	}

	function _parseList(parent: LibConfigPropertyNode | ListLibConfigNode) : ListLibConfigNode {
		let back = new ListLibConfigNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			[]
		);

		// Move to next token
		_scanNext();
		if (scanner.getToken() === SyntaxKind.CloseParenToken) {
			back.length = scanner.getPosition() - back.offset
			return back;
		}

		var value = _parseValue(back, false);
		if(value){
			back.addChild(value);
		}
		let nextToken = _scanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseParenToken &&
			scanner.getToken() !== SyntaxKind.EOF
		) {
			if (nextToken !== SyntaxKind.CommaToken) {
				_error(
					localize('CommaExpected', 'Expected a comma'),
					ErrorCode.CommaExpected,
					[SyntaxKind.CloseParenToken],
					[SyntaxKind.CommaToken]
				);
				continue;
			}
			value = _parseValue(back);
			if(value) {
				back.addChild(value);
			}
			nextToken = _scanNext();
		}

		back.length = scanner.getPosition() - back.offset;
		return back;
	}

	function _parseArray(parent: LibConfigPropertyNode | ListLibConfigNode) : ArrayLibConfigNode {
		// Move to next token
		let back: ArrayLibConfigNodeImpl = new ArrayLibConfigNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			[]
		);
		_scanNext();
		if (scanner.getToken() === SyntaxKind.CloseBracketToken) {
			back.length = scanner.getPosition() - back.offset;
			return back;
		}

		let value = _parseScalarValue(back, false);

		if(value) {
			back.addChild(value);
		}

		let nextToken = _scanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseBracketToken &&
			scanner.getToken() !== SyntaxKind.EOF &&
			scanner.getToken() !== SyntaxKind.SemicolonToken
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
			value = _parseScalarValue(back);

			if(value) {
				back.addChild(value);
			}

			nextToken = _scanNext();
		}

		back.length = scanner.getTokenOffset() - back.offset;

		return back;
	}

	function _parseTerminator() {
		if (_scanNext() !== SyntaxKind.SemicolonToken) {
			_error(
				localize('ExpectedSemicolon', 'Expected a terminator'),
				ErrorCode.SemicolonExpected
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

	BaseLibConfigNodeImpl.addErrorCallback((errorInfo, start, length)=>{
		_errorAtRange(errorInfo, ErrorCode.Undefined, start, start + length)
	});

	_scanNext();
	while (scanner.getToken() !== SyntaxKind.EOF) {
		var prop = _parseSetting(null);
	}
	return new LibConfigDocument(problems, commentRanges);
}