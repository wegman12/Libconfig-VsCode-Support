"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scanError_1 = require("../dataClasses/scanError");
const syntaxKind_1 = require("../dataClasses/syntaxKind");
const generateScanner_1 = require("../scanner/impl/generateScanner");
const vscode_languageserver_1 = require("vscode-languageserver");
function getFoldingRanges(document, context) {
    let ranges = [];
    let nestingLevels = [];
    let stack = [];
    let prevStart = -1;
    let scanner = generateScanner_1.CreateDefaultScanner(document.getText(), false);
    let t = document.getText();
    let token = scanner.scan();
    function addRange(range) {
        ranges.push(range);
        nestingLevels.push(stack.length);
    }
    while (token !== syntaxKind_1.SyntaxKind.EOF) {
        switch (token) {
            case syntaxKind_1.SyntaxKind.OpenBraceToken:
            case syntaxKind_1.SyntaxKind.OpenBracketToken:
            case syntaxKind_1.SyntaxKind.OpenParenToken: {
                let startLine = document.positionAt(scanner.getTokenOffset()).line;
                let range = {
                    startLine,
                    endLine: startLine,
                    kind: token === syntaxKind_1.SyntaxKind.OpenBraceToken ? 'object' : 'array'
                };
                stack.push(range);
                break;
            }
            case syntaxKind_1.SyntaxKind.CloseBraceToken:
            case syntaxKind_1.SyntaxKind.CloseBracketToken:
            case syntaxKind_1.SyntaxKind.CloseParenToken: {
                let kind = token === syntaxKind_1.SyntaxKind.CloseBraceToken ? 'object' : 'array';
                if (stack.length > 0 && stack[stack.length - 1].kind === kind) {
                    let range = stack.pop();
                    let line = document.positionAt(scanner.getTokenOffset()).line;
                    if (range && line > range.startLine + 1 && prevStart !== range.startLine) {
                        range.endLine = line - 1;
                        addRange(range);
                        prevStart = range.startLine;
                    }
                }
                break;
            }
            case syntaxKind_1.SyntaxKind.BlockCommentTrivia: {
                let startLine = document.positionAt(scanner.getTokenOffset())
                    .line;
                let endLine = document.positionAt(scanner.getTokenOffset() + scanner.getTokenLength())
                    .line;
                if (scanner.getTokenError() === scanError_1.ScanError.UnexpectedEndOfComment &&
                    startLine + 1 < document.lineCount) {
                    scanner.setPosition(document.offsetAt(vscode_languageserver_1.Position.create(startLine + 1, 0)));
                }
                else {
                    if (startLine < endLine) {
                        addRange({
                            startLine,
                            endLine,
                            kind: vscode_languageserver_1.FoldingRangeKind.Comment
                        });
                        prevStart = startLine;
                    }
                }
                break;
            }
            case syntaxKind_1.SyntaxKind.LineCommentTrivia: {
                let text = document.getText().substr(scanner.getTokenOffset(), scanner.getTokenLength());
                let m = text.match(/^\/\/\s*#(region\b)|(endregion\b)/);
                if (m) {
                    let line = document.positionAt(scanner.getTokenOffset()).line;
                    if (m[1]) { // start pattern match
                        let range = { startLine: line, endLine: line, kind: vscode_languageserver_1.FoldingRangeKind.Region };
                        stack.push(range);
                    }
                    else {
                        let i = stack.length - 1;
                        while (i >= 0 && stack[i].kind !== vscode_languageserver_1.FoldingRangeKind.Region) {
                            i--;
                        }
                        if (i >= 0) {
                            let range = stack[i];
                            stack.length = i;
                            if (line > range.startLine && prevStart !== range.startLine) {
                                range.endLine = line;
                                addRange(range);
                                prevStart = range.startLine;
                            }
                        }
                    }
                }
                break;
            }
        }
        token = scanner.scan();
    }
    let rangeLimit = context && context.rangeLimit;
    if (typeof rangeLimit !== 'number' || ranges.length <= rangeLimit) {
        return ranges;
    }
    if (context && context.onRangeLimitExceeded) {
        context.onRangeLimitExceeded(document.uri);
    }
    let counts = [];
    for (let level of nestingLevels) {
        if (level < 30) {
            counts[level] = (counts[level] || 0) + 1;
        }
    }
    let entries = 0;
    let maxLevel = 0;
    for (let i = 0; i < counts.length; i++) {
        let n = counts[i];
        if (n) {
            if (n + entries > rangeLimit) {
                maxLevel = i;
                break;
            }
            entries += n;
        }
    }
    let result = [];
    for (let i = 0; i < ranges.length; i++) {
        let level = nestingLevels[i];
        if (typeof level === 'number') {
            if (level < maxLevel || (level === maxLevel && entries++ < rangeLimit)) {
                result.push(ranges[i]);
            }
        }
    }
    return result;
}
exports.getFoldingRanges = getFoldingRanges;
//# sourceMappingURL=libConfigFolding.js.map