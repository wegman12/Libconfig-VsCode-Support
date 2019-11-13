'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const generateScanner_1 = require("../scanner/impl/generateScanner");
const dataClasses_1 = require("../dataClasses");
const nls = require("vscode-nls");
const localize = nls.loadMessageBundle();
function ParseLibConfigDocument(textDocument) {
    let problems = [];
    let lastProblemOffset = -1;
    let text = textDocument.getText();
    let scanner = generateScanner_1.CreateDefaultScanner(text, false);
    let commentRanges = [];
    function _scanNext() {
        while (true) {
            let token = scanner.scan();
            _checkScanError();
            switch (token) {
                case dataClasses_1.SyntaxKind.LineCommentTrivia:
                case dataClasses_1.SyntaxKind.BlockCommentTrivia:
                    if (Array.isArray(commentRanges)) {
                        commentRanges.push(vscode_languageserver_1.Range.create(textDocument.positionAt(scanner.getTokenOffset()), textDocument.positionAt(scanner.getTokenOffset() + scanner.getTokenLength())));
                    }
                    break;
                case dataClasses_1.SyntaxKind.Trivia:
                case dataClasses_1.SyntaxKind.LineBreakTrivia:
                    break;
                default:
                    return token;
            }
        }
    }
    function _parseSetting() {
        if (scanner.getToken() !== dataClasses_1.SyntaxKind.PropertyName) {
            _error(localize('ExpectedProperty', "Expected a property value name"), dataClasses_1.ErrorCode.PropertyExpected, [dataClasses_1.SyntaxKind.SemicolonToken]);
            return;
        }
        let token = _scanNext();
        if (token !== dataClasses_1.SyntaxKind.EqualToken && token !== dataClasses_1.SyntaxKind.ColonToken) {
            _error(localize('ExpectedSetter', 'Expected a colon or equal'), dataClasses_1.ErrorCode.ColonExpected, [dataClasses_1.SyntaxKind.SemicolonToken]);
            return;
        }
        _parseValue();
        _parseTerminator();
    }
    function _parseValue(scan = true) {
        let token = scan ? _scanNext() : scanner.getToken();
        switch (token) {
            case dataClasses_1.SyntaxKind.OpenBraceToken:
                // Parse Group
                _parseGroup();
                return dataClasses_1.SettingKind.Group;
            case dataClasses_1.SyntaxKind.OpenParenToken:
                // Parse List
                _parseList();
                return dataClasses_1.SettingKind.List;
            case dataClasses_1.SyntaxKind.OpenBracketToken:
                // Parse Array
                _parseArray();
                return dataClasses_1.SettingKind.Array;
            case dataClasses_1.SyntaxKind.NumericLiteral:
                return dataClasses_1.SettingKind.Number;
            case dataClasses_1.SyntaxKind.TrueKeyword:
            case dataClasses_1.SyntaxKind.FalseKeyword:
                return dataClasses_1.SettingKind.Number;
            case dataClasses_1.SyntaxKind.StringLiteral:
                return dataClasses_1.SettingKind.String;
            default:
                _error(localize('UnrecognizedType', 'Expected setting type kind value'), dataClasses_1.ErrorCode.ValueExpected, [], [dataClasses_1.SyntaxKind.SemicolonToken]);
                return dataClasses_1.SettingKind.Invalid;
        }
    }
    function _parseGroup() {
        // Move to next token
        _scanNext();
        while (scanner.getToken() !== dataClasses_1.SyntaxKind.CloseBraceToken &&
            scanner.getToken() !== dataClasses_1.SyntaxKind.EOF) {
            _parseSetting();
        }
    }
    function _parseList() {
        // Move to next token
        _scanNext();
        if (scanner.getToken() === dataClasses_1.SyntaxKind.CloseParenToken) {
            return;
        }
        _parseValue(false);
        let nextToken = _scanNext();
        while (scanner.getToken() !== dataClasses_1.SyntaxKind.CloseParenToken &&
            scanner.getToken() !== dataClasses_1.SyntaxKind.EOF) {
            if (nextToken !== dataClasses_1.SyntaxKind.CommaToken) {
                _error(localize('CommaExpected', 'Expected a comma'), dataClasses_1.ErrorCode.CommaExpected, [dataClasses_1.SyntaxKind.CloseParenToken, dataClasses_1.SyntaxKind.CommaToken]);
                continue;
            }
            _parseValue();
            nextToken = _scanNext();
        }
    }
    function _parseArray() {
        // Move to next token
        _scanNext();
        if (scanner.getToken() === dataClasses_1.SyntaxKind.CloseBracketToken) {
            return;
        }
        let validateValue = (value) => {
            switch (firstKind) {
                case dataClasses_1.SettingKind.Number:
                case dataClasses_1.SettingKind.Boolean:
                case dataClasses_1.SettingKind.String:
                    break;
                default:
                    _error(localize('InvalidArrayEntry', 'Array entries must be scalar values'), dataClasses_1.ErrorCode.ValueExpected);
            }
        };
        let firstKind = _parseValue(false);
        validateValue(firstKind);
        let nextToken = _scanNext();
        while (scanner.getToken() !== dataClasses_1.SyntaxKind.CloseBracketToken &&
            scanner.getToken() !== dataClasses_1.SyntaxKind.EOF) {
            if (nextToken !== dataClasses_1.SyntaxKind.CommaToken) {
                _error(localize('CommaExpected', 'Expected a comma'), dataClasses_1.ErrorCode.CommaExpected, [dataClasses_1.SyntaxKind.CloseBracketToken], [dataClasses_1.SyntaxKind.CommaToken]);
                continue;
            }
            let secondKind = _parseValue();
            validateValue(secondKind);
            if (firstKind === dataClasses_1.SettingKind.Invalid) {
                firstKind = secondKind;
            }
            if (firstKind !== secondKind) {
                _error(localize('MismatchArrayType', 'Array entries must all have the same type'), dataClasses_1.ErrorCode.ValueExpected);
            }
            nextToken = _scanNext();
        }
    }
    function _parseTerminator() {
        if (_scanNext() !== dataClasses_1.SyntaxKind.SemicolonToken) {
            _error(localize('ExpectedSemicolon', 'Expected a terminator'), dataClasses_1.ErrorCode.SemicolonExpected, [dataClasses_1.SyntaxKind.SemicolonToken, dataClasses_1.SyntaxKind.LineBreakTrivia]);
            return;
        }
        // Move to next
        _scanNext();
    }
    function _errorAtRange(message, code, startOffset, endOffset, severity = vscode_languageserver_1.DiagnosticSeverity.Error) {
        if (problems.length === 0 || startOffset !== lastProblemOffset) {
            let range = vscode_languageserver_1.Range.create(textDocument.positionAt(startOffset), textDocument.positionAt(endOffset));
            problems.push(vscode_languageserver_1.Diagnostic.create(range, message, severity, code, textDocument.languageId));
            lastProblemOffset = startOffset;
        }
    }
    function _error(message, code, skipUntilAfter = [], skipUntil = []) {
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
            while (token !== dataClasses_1.SyntaxKind.EOF) {
                if (skipUntilAfter.indexOf(token) !== -1) {
                    _scanNext();
                    break;
                }
                else if (skipUntil.indexOf(token) !== -1) {
                    break;
                }
                token = _scanNext();
            }
        }
    }
    function _checkScanError() {
        switch (scanner.getTokenError()) {
            case dataClasses_1.ScanError.InvalidUnicode:
                _error(localize('InvalidUnicode', 'Invalid unicode sequence in string.'), dataClasses_1.ErrorCode.InvalidUnicode);
                return true;
            case dataClasses_1.ScanError.InvalidEscapeCharacter:
                _error(localize('InvalidEscapeCharacter', 'Invalid escape character in string.'), dataClasses_1.ErrorCode.InvalidEscapeCharacter);
                return true;
            case dataClasses_1.ScanError.UnexpectedEndOfNumber:
                _error(localize('UnexpectedEndOfNumber', 'Unexpected end of number.'), dataClasses_1.ErrorCode.UnexpectedEndOfNumber);
                return true;
            case dataClasses_1.ScanError.UnexpectedEndOfComment:
                _error(localize('UnexpectedEndOfComment', 'Unexpected end of comment.'), dataClasses_1.ErrorCode.UnexpectedEndOfComment);
                return true;
            case dataClasses_1.ScanError.UnexpectedEndOfString:
                _error(localize('UnexpectedEndOfString', 'Unexpected end of string.'), dataClasses_1.ErrorCode.UnexpectedEndOfString);
                return true;
            case dataClasses_1.ScanError.InvalidCharacter:
                _error(localize('InvalidCharacter', 'Invalid characters in string. Control characters must be escaped.'), dataClasses_1.ErrorCode.InvalidCharacter);
                return true;
        }
        return false;
    }
    _scanNext();
    while (scanner.getToken() !== dataClasses_1.SyntaxKind.EOF) {
        _parseSetting();
    }
    return new dataClasses_1.LibConfigDocument(problems, commentRanges);
}
exports.ParseLibConfigDocument = ParseLibConfigDocument;
//# sourceMappingURL=libConfigParser.js.map