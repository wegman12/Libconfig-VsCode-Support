'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const libConfigParser_1 = require("../parser/libConfigParser");
class LibConfigValidation {
    constructor(promiseConstructor) {
        this.promise = promiseConstructor;
    }
    doValidation(textDocument) {
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
        return this.promise.resolve(getDiagnostics());
    }
}
exports.LibConfigValidation = LibConfigValidation;
//# sourceMappingURL=libConfigValidation.js.map