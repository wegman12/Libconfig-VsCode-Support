import { Diagnostic, Range } from 'vscode-languageserver';

export class LibConfigDocument {

	constructor(public readonly syntaxErrors: Diagnostic[] = [], public readonly comments: Range[] = []) {
	}

}