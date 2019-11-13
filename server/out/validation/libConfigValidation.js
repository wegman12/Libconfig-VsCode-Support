'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const libConfigParser_1 = require("../parser/libConfigParser");
function doValidation(textDocument) {
    let libConfigDocument = libConfigParser_1.ParseLibConfigDocument(textDocument);
    let diagnostics = [];
    let added = {};
    let addProblem = (problem) => {
        // remove duplicated messages
        let signature = problem.range.start.line + ' ' + problem.range.start.character + ' ' + problem.message;
        if (!added[signature]) {
            added[signature] = true;
            diagnostics.push(problem);
        }
    };
    let getDiagnostics = () => {
        for (const p of libConfigDocument.syntaxErrors) {
            addProblem(p);
        }
        return diagnostics;
    };
    return getDiagnostics();
}
exports.doValidation = doValidation;
//# sourceMappingURL=libConfigValidation.js.map