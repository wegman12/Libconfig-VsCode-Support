/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const generateScanner_1 = require("../scanner/impl/generateScanner");
const index_1 = require("../dataClasses/index");
function FormatLibConfigDocument(documentText, options) {
    let initialIndentLevel;
    let formatText;
    let formatTextStart;
    let rangeStart;
    let rangeEnd;
    formatText = documentText;
    initialIndentLevel = 0;
    formatTextStart = 0;
    rangeStart = 0;
    rangeEnd = documentText.length;
    let eol = getEOL(options, documentText);
    let lineBreak = false;
    let indentLevel = 0;
    let indentValue;
    if (options.insertSpaces) {
        indentValue = repeat(' ', options.tabSize || 4);
    }
    else {
        indentValue = '\t';
    }
    let scanner = generateScanner_1.CreateDefaultScanner(formatText, false);
    let hasError = false;
    function newLineAndIndent() {
        return eol + repeat(indentValue, initialIndentLevel + indentLevel);
    }
    function scanNext() {
        let token = scanner.scan();
        lineBreak = false;
        while (token === index_1.SyntaxKind.Trivia ||
            token === index_1.SyntaxKind.LineBreakTrivia) {
            lineBreak = lineBreak || (token === index_1.SyntaxKind.LineBreakTrivia);
            token = scanner.scan();
        }
        hasError = token === index_1.SyntaxKind.Unknown || scanner.getTokenError() !== index_1.ScanError.None;
        return token;
    }
    let editOperations = [];
    function addEdit(text, startOffset, endOffset) {
        if (!hasError && startOffset < rangeEnd && endOffset > rangeStart && documentText.substring(startOffset, endOffset) !== text) {
            editOperations.push({ offset: startOffset, length: endOffset - startOffset, content: text });
        }
    }
    let firstToken = scanNext();
    if (firstToken !== index_1.SyntaxKind.EOF) {
        let firstTokenStart = scanner.getTokenOffset() + formatTextStart;
        let initialIndent = repeat(indentValue, initialIndentLevel);
        addEdit(initialIndent, formatTextStart, firstTokenStart);
    }
    while (firstToken !== index_1.SyntaxKind.EOF) {
        let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
        let secondToken = scanNext();
        let replaceContent = '';
        while (!lineBreak && (secondToken === index_1.SyntaxKind.LineCommentTrivia || secondToken === index_1.SyntaxKind.BlockCommentTrivia)) {
            // comments on the same line: keep them on the same line, but ignore them otherwise
            let commentTokenStart = scanner.getTokenOffset() + formatTextStart;
            addEdit(' ', firstTokenEnd, commentTokenStart);
            firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
            replaceContent = secondToken === index_1.SyntaxKind.LineCommentTrivia ? newLineAndIndent() : '';
            secondToken = scanNext();
        }
        if (secondToken === index_1.SyntaxKind.CloseBraceToken) {
            if (firstToken !== index_1.SyntaxKind.OpenBraceToken) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else if (secondToken === index_1.SyntaxKind.CloseBracketToken) {
            if (firstToken !== index_1.SyntaxKind.OpenBracketToken) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else if (secondToken === index_1.SyntaxKind.CloseParenToken) {
            if (firstToken !== index_1.SyntaxKind.OpenParenToken) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else {
            switch (firstToken) {
                case index_1.SyntaxKind.OpenBracketToken:
                case index_1.SyntaxKind.OpenBraceToken:
                case index_1.SyntaxKind.OpenParenToken:
                    indentLevel++;
                    replaceContent = newLineAndIndent();
                    break;
                case index_1.SyntaxKind.CommaToken:
                case index_1.SyntaxKind.LineCommentTrivia:
                case index_1.SyntaxKind.SemicolonToken:
                case index_1.SyntaxKind.ColonToken:
                    replaceContent = newLineAndIndent();
                    break;
                case index_1.SyntaxKind.BlockCommentTrivia:
                    if (lineBreak) {
                        replaceContent = newLineAndIndent();
                    }
                    else {
                        // symbol following comment on the same line: keep on same line, separate with ' '
                        replaceContent = ' ';
                    }
                    break;
                case index_1.SyntaxKind.PropertyName:
                case index_1.SyntaxKind.EqualToken:
                    replaceContent = ' ';
                    break;
                case index_1.SyntaxKind.StringLiteral:
                    if (secondToken === index_1.SyntaxKind.ColonToken) {
                        replaceContent = '';
                        break;
                    }
                // fall through
                case index_1.SyntaxKind.TrueKeyword:
                case index_1.SyntaxKind.FalseKeyword:
                case index_1.SyntaxKind.NumericLiteral:
                case index_1.SyntaxKind.CloseBraceToken:
                case index_1.SyntaxKind.CloseBracketToken:
                case index_1.SyntaxKind.CloseParenToken:
                    if (secondToken === index_1.SyntaxKind.LineCommentTrivia || secondToken === index_1.SyntaxKind.BlockCommentTrivia) {
                        replaceContent = ' ';
                    }
                    else if (secondToken !== index_1.SyntaxKind.CommaToken && secondToken !== index_1.SyntaxKind.EOF) {
                        hasError = true;
                    }
                    break;
                case index_1.SyntaxKind.Unknown:
                    hasError = true;
                    break;
            }
            if (lineBreak && (secondToken === index_1.SyntaxKind.LineCommentTrivia || secondToken === index_1.SyntaxKind.BlockCommentTrivia)) {
                replaceContent = newLineAndIndent();
            }
        }
        let secondTokenStart = scanner.getTokenOffset() + formatTextStart;
        addEdit(replaceContent, firstTokenEnd, secondTokenStart);
        firstToken = secondToken;
    }
    return editOperations;
}
exports.FormatLibConfigDocument = FormatLibConfigDocument;
function repeat(s, count) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += s;
    }
    return result;
}
function computeIndentLevel(content, options) {
    let i = 0;
    let nChars = 0;
    let tabSize = options.tabSize || 4;
    while (i < content.length) {
        let ch = content.charAt(i);
        if (ch === ' ') {
            nChars++;
        }
        else if (ch === '\t') {
            nChars += tabSize;
        }
        else {
            break;
        }
        i++;
    }
    return Math.floor(nChars / tabSize);
}
function getEOL(options, text) {
    for (let i = 0; i < text.length; i++) {
        let ch = text.charAt(i);
        if (ch === '\r') {
            if (i + 1 < text.length && text.charAt(i + 1) === '\n') {
                return '\r\n';
            }
            return '\r';
        }
        else if (ch === '\n') {
            return '\n';
        }
    }
    if (options && options.eol && typeof options.eol === 'string')
        return options.eol;
    return '\n';
}
function isEOL(text, offset) {
    return '\r\n'.indexOf(text.charAt(offset)) !== -1;
}
exports.isEOL = isEOL;
//# sourceMappingURL=libConfigFormat.js.map