'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const syntaxKind_1 = require("../../dataClasses/syntaxKind");
const scanError_1 = require("../../dataClasses/scanError");
/**
 * Creates a libconfig scanner on the given text.
 * If ignoreTrivia is set, whitespaces or comments are ignored.
 */
function CreateDefaultScanner(text, ignoreTrivia = false) {
    const len = text.length;
    let pos = 0, value = '', tokenOffset = 0, token = syntaxKind_1.SyntaxKind.Unknown, lineNumber = 0, lineStartOffset = 0, tokenLineStartOffset = 0, prevTokenLineStartOffset = 0, scanError = scanError_1.ScanError.None;
    function scanHexDigits(count, exact) {
        let digits = 0;
        let value = 0;
        while (digits < count || !exact) {
            let ch = text.charCodeAt(pos);
            if (ch >= 48 /* _0 */ && ch <= 57 /* _9 */) {
                value = value * 16 + ch - 48 /* _0 */;
            }
            else if (ch >= 65 /* A */ && ch <= 70 /* F */) {
                value = value * 16 + ch - 65 /* A */ + 10;
            }
            else if (ch >= 97 /* a */ && ch <= 102 /* f */) {
                value = value * 16 + ch - 97 /* a */ + 10;
            }
            else {
                break;
            }
            pos++;
            digits++;
        }
        if (digits < count) {
            value = -1;
        }
        return value;
    }
    function setPosition(newPosition) {
        pos = newPosition;
        value = '';
        tokenOffset = 0;
        token = syntaxKind_1.SyntaxKind.Unknown;
        scanError = scanError_1.ScanError.None;
    }
    function scanNumber() {
        let start = pos;
        if (text.charCodeAt(pos) === 48 /* _0 */) {
            pos++;
        }
        else {
            pos++;
            while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
            }
        }
        if (pos < text.length && text.charCodeAt(pos) === 46 /* dot */) {
            pos++;
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
            }
            else {
                scanError = scanError_1.ScanError.UnexpectedEndOfNumber;
                return text.substring(start, pos);
            }
        }
        let end = pos;
        if (pos < text.length && (text.charCodeAt(pos) === 69 /* E */ || text.charCodeAt(pos) === 101 /* e */)) {
            pos++;
            if (pos < text.length && text.charCodeAt(pos) === 43 /* plus */ || text.charCodeAt(pos) === 45 /* minus */) {
                pos++;
            }
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
                end = pos;
            }
            else {
                scanError = scanError_1.ScanError.UnexpectedEndOfNumber;
            }
        }
        return text.substring(start, end);
    }
    function scanString() {
        let result = '', start = pos;
        while (true) {
            if (pos >= len) {
                result += text.substring(start, pos);
                scanError = scanError_1.ScanError.UnexpectedEndOfString;
                break;
            }
            const ch = text.charCodeAt(pos);
            if (ch === 34 /* doubleQuote */) {
                result += text.substring(start, pos);
                pos++;
                break;
            }
            if (ch === 92 /* backslash */) {
                result += text.substring(start, pos);
                pos++;
                if (pos >= len) {
                    scanError = scanError_1.ScanError.UnexpectedEndOfString;
                    break;
                }
                const ch2 = text.charCodeAt(pos++);
                switch (ch2) {
                    case 34 /* doubleQuote */:
                        result += '\"';
                        break;
                    case 92 /* backslash */:
                        result += '\\';
                        break;
                    case 47 /* slash */:
                        result += '/';
                        break;
                    case 98 /* b */:
                        result += '\b';
                        break;
                    case 102 /* f */:
                        result += '\f';
                        break;
                    case 110 /* n */:
                        result += '\n';
                        break;
                    case 114 /* r */:
                        result += '\r';
                        break;
                    case 116 /* t */:
                        result += '\t';
                        break;
                    case 117 /* u */:
                        const ch3 = scanHexDigits(4, true);
                        if (ch3 >= 0) {
                            result += String.fromCharCode(ch3);
                        }
                        else {
                            scanError = scanError_1.ScanError.InvalidUnicode;
                        }
                        break;
                    default:
                        scanError = scanError_1.ScanError.InvalidEscapeCharacter;
                }
                start = pos;
                continue;
            }
            if (ch >= 0 && ch <= 0x1f) {
                if (isLineBreak(ch)) {
                    result += text.substring(start, pos);
                    scanError = scanError_1.ScanError.UnexpectedEndOfString;
                    break;
                }
                else {
                    scanError = scanError_1.ScanError.InvalidCharacter;
                    // mark as error but continue with string
                }
            }
            pos++;
        }
        return result;
    }
    function scanPropertyName() {
        let result = text.charAt(pos - 1), start = pos - 1;
        while (isValidPropertyCharacter(text.charCodeAt(pos))) {
            result += text.charAt(pos);
            pos++;
        }
        return result;
    }
    function scanNext() {
        value = '';
        scanError = scanError_1.ScanError.None;
        tokenOffset = pos;
        lineStartOffset = lineNumber;
        prevTokenLineStartOffset = tokenLineStartOffset;
        if (pos >= len) {
            // at the end
            tokenOffset = len;
            return token = syntaxKind_1.SyntaxKind.EOF;
        }
        let code = text.charCodeAt(pos);
        // trivia: whitespace
        if (isWhiteSpace(code)) {
            do {
                pos++;
                value += String.fromCharCode(code);
                code = text.charCodeAt(pos);
            } while (isWhiteSpace(code));
            return token = syntaxKind_1.SyntaxKind.Trivia;
        }
        // trivia: newlines
        if (isLineBreak(code)) {
            pos++;
            value += String.fromCharCode(code);
            if (code === 13 /* carriageReturn */ && text.charCodeAt(pos) === 10 /* lineFeed */) {
                pos++;
                value += '\n';
            }
            lineNumber++;
            tokenLineStartOffset = pos;
            return token = syntaxKind_1.SyntaxKind.LineBreakTrivia;
        }
        switch (code) {
            case 123 /* openBrace */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.OpenBraceToken;
            case 125 /* closeBrace */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.CloseBraceToken;
            case 40 /* openParen */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.OpenParenToken;
            case 41 /* closeParen */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.CloseParenToken;
            case 91 /* openBracket */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.OpenBracketToken;
            case 93 /* closeBracket */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.CloseBracketToken;
            case 58 /* colon */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.ColonToken;
            case 44 /* comma */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.CommaToken;
            case 61 /* equals */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.EqualToken;
            case 59 /* semicolon */:
                pos++;
                return token = syntaxKind_1.SyntaxKind.SemicolonToken;
            // strings
            case 34 /* doubleQuote */:
                pos++;
                value = scanString();
                return token = syntaxKind_1.SyntaxKind.StringLiteral;
            // comments
            case 47 /* slash */:
                const start = pos - 1;
                // Single-line comment
                if (text.charCodeAt(pos + 1) === 47 /* slash */) {
                    pos += 2;
                    while (pos < len) {
                        if (isLineBreak(text.charCodeAt(pos))) {
                            break;
                        }
                        pos++;
                    }
                    value = text.substring(start, pos);
                    return token = syntaxKind_1.SyntaxKind.LineCommentTrivia;
                }
                // Multi-line comment
                if (text.charCodeAt(pos + 1) === 42 /* asterisk */) {
                    pos += 2;
                    const safeLength = len - 1; // For lookahead.
                    let commentClosed = false;
                    while (pos < safeLength) {
                        const ch = text.charCodeAt(pos);
                        if (ch === 42 /* asterisk */ && text.charCodeAt(pos + 1) === 47 /* slash */) {
                            pos += 2;
                            commentClosed = true;
                            break;
                        }
                        pos++;
                        if (isLineBreak(ch)) {
                            if (ch === 13 /* carriageReturn */ && text.charCodeAt(pos) === 10 /* lineFeed */) {
                                pos++;
                            }
                            lineNumber++;
                            tokenLineStartOffset = pos;
                        }
                    }
                    if (!commentClosed) {
                        pos++;
                        scanError = scanError_1.ScanError.UnexpectedEndOfComment;
                    }
                    value = text.substring(start, pos);
                    return token = syntaxKind_1.SyntaxKind.BlockCommentTrivia;
                }
                // just a single slash
                value += String.fromCharCode(code);
                pos++;
                return token = syntaxKind_1.SyntaxKind.Unknown;
            case 35 /* hash */:
                const s2 = pos - 1;
                pos++;
                while (pos < len) {
                    if (isLineBreak(text.charCodeAt(pos))) {
                        break;
                    }
                    pos++;
                }
                value = text.substring(s2, pos);
                return token = syntaxKind_1.SyntaxKind.LineCommentTrivia;
            case 45 /* minus */:
                value += String.fromCharCode(code);
                pos++;
                if (pos === len || !isDigit(text.charCodeAt(pos))) {
                    return token = syntaxKind_1.SyntaxKind.Unknown;
                }
            // found a minus, followed by a number so
            // we fall through to proceed with scanning
            // numbers
            case 48 /* _0 */:
            case 49 /* _1 */:
            case 50 /* _2 */:
            case 51 /* _3 */:
            case 52 /* _4 */:
            case 53 /* _5 */:
            case 54 /* _6 */:
            case 55 /* _7 */:
            case 56 /* _8 */:
            case 57 /* _9 */:
                value += scanNumber();
                return token = syntaxKind_1.SyntaxKind.NumericLiteral;
            // literals and unknown symbols
            default:
                if (isValidPropertyCharacterStart(code)) {
                    pos++;
                    value = scanPropertyName();
                    // keywords: true, false
                    switch (value) {
                        case 'true': return token = syntaxKind_1.SyntaxKind.TrueKeyword;
                        case 'false': return token = syntaxKind_1.SyntaxKind.FalseKeyword;
                    }
                    return token = syntaxKind_1.SyntaxKind.PropertyName;
                }
                // is a literal? Read the full word.
                while (pos < len && isUnknownContentCharacter(code)) {
                    pos++;
                    code = text.charCodeAt(pos);
                }
                if (tokenOffset !== pos) {
                    value = text.substring(tokenOffset, pos);
                    // keywords: true, false, null
                    switch (value) {
                        case 'true': return token = syntaxKind_1.SyntaxKind.TrueKeyword;
                        case 'false': return token = syntaxKind_1.SyntaxKind.FalseKeyword;
                    }
                    return token = syntaxKind_1.SyntaxKind.Unknown;
                }
                // some
                value += String.fromCharCode(code);
                pos++;
                return token = syntaxKind_1.SyntaxKind.Unknown;
        }
    }
    function isUnknownContentCharacter(code) {
        if (isWhiteSpace(code) || isLineBreak(code)) {
            return false;
        }
        switch (code) {
            case 125 /* closeBrace */:
            case 93 /* closeBracket */:
            case 123 /* openBrace */:
            case 91 /* openBracket */:
            case 34 /* doubleQuote */:
            case 58 /* colon */:
            case 44 /* comma */:
            case 47 /* slash */:
                return false;
        }
        return true;
    }
    function scanNextNonTrivia() {
        let result;
        do {
            result = scanNext();
        } while (result >= syntaxKind_1.SyntaxKind.LineCommentTrivia && result <= syntaxKind_1.SyntaxKind.Trivia);
        return result;
    }
    return {
        setPosition: setPosition,
        getPosition: () => pos,
        scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
        getToken: () => token,
        getTokenValue: () => value,
        getTokenOffset: () => tokenOffset,
        getTokenLength: () => pos - tokenOffset,
        getTokenStartLine: () => lineStartOffset,
        getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
        getTokenError: () => scanError,
    };
}
exports.CreateDefaultScanner = CreateDefaultScanner;
function isWhiteSpace(ch) {
    switch (ch) {
        case 32 /* space */:
        case 9 /* tab */:
        case 11 /* verticalTab */:
        case 12 /* formFeed */:
        case 160 /* nonBreakingSpace */:
        case 5760 /* ogham */:
        case 8192 /* enQuad */:
        case 8203 /* zeroWidthSpace */:
        case 8239 /* narrowNoBreakSpace */:
        case 8287 /* mathematicalSpace */:
        case 12288 /* ideographicSpace */:
        case 65279 /* byteOrderMark */:
            return true;
        default:
            return false;
    }
}
function isLineBreak(ch) {
    switch (ch) {
        case 10 /* lineFeed */:
        case 13 /* carriageReturn */:
        case 8232 /* lineSeparator */:
        case 8233 /* paragraphSeparator */:
            return true;
        default:
            return false;
    }
}
function isDigit(ch) {
    return ch >= 48 /* _0 */ && ch <= 57 /* _9 */;
}
function isValidPropertyCharacterStart(ch) {
    return (ch >= 65 /* A */ && ch <= 90 /* Z */) ||
        (ch >= 97 /* a */ && ch <= 122 /* z */) ||
        (ch === 95 /* underscore */) || (ch === 45 /* minus */);
}
function isValidPropertyCharacter(ch) {
    return isValidPropertyCharacterStart(ch) || isDigit(ch);
}
//# sourceMappingURL=generateScanner.js.map