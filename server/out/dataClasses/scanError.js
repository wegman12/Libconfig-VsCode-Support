'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var ScanError;
(function (ScanError) {
    ScanError[ScanError["None"] = 0] = "None";
    ScanError[ScanError["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
    ScanError[ScanError["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
    ScanError[ScanError["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
    ScanError[ScanError["InvalidUnicode"] = 4] = "InvalidUnicode";
    ScanError[ScanError["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
    ScanError[ScanError["InvalidCharacter"] = 6] = "InvalidCharacter";
    ScanError[ScanError["UnexpectedEndOfPropertyName"] = 7] = "UnexpectedEndOfPropertyName";
})(ScanError = exports.ScanError || (exports.ScanError = {}));
//# sourceMappingURL=scanError.js.map