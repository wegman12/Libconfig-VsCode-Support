'use strict';

import {
	TextDocument,
	Diagnostic
} from 'vscode-languageserver';

import {
	ParseLibConfigDocument
} from '../parser/libConfigParser';

export function doValidation(textDocument: TextDocument): Diagnostic[] {
	let libConfigDocument = ParseLibConfigDocument(textDocument);
	let diagnostics: Diagnostic[] = [];
	let added: { [signature: string]: boolean } = {};
	let addProblem = (problem: Diagnostic) => {
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