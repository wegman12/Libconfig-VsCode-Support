/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	CancellationToken,
	ResponseError,
	ErrorCodes
} from 'vscode-languageserver';

import { 
	formatError, 
	runSafe, 
	runSafeAsync 
} from './utils/runner';

import {
	getFoldingRanges
} from './folding/libConfigFolding';
import { LibConfigValidation } from './validation/libConfigValidation';

import { posix } from 'path';


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

connection.console.log('SERVER STARTED');

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			},
			foldingRangeProvider: true
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

namespace LimitExceededWarnings {
	const pendingWarnings: { [uri: string]: { features: { [name: string]: string }; timeout?: NodeJS.Timeout; } } = {};

	export function cancel(uri: string) {
		const warning = pendingWarnings[uri];
		if (warning && warning.timeout) {
			clearTimeout(warning.timeout);
			delete pendingWarnings[uri];
		}
	}

	export function onResultLimitExceeded(uri: string, resultLimit: number, name: string) {
		return () => {
			let warning = pendingWarnings[uri];
			if (warning) {
				if (!warning.timeout) {
					// already shown
					return;
				}
				warning.features[name] = name;
				warning.timeout.refresh();
			} else {
				warning = { features: { [name]: name } };
				warning.timeout = setTimeout(() => {
					connection.window.showInformationMessage(`${posix.basename(uri)}: For performance reasons, ${Object.keys(warning.features).join(' and ')} have been limited to ${resultLimit} items.`);
					warning.timeout = undefined;
				}, 2000);
				pendingWarnings[uri] = warning;
			}
		};
	}
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.libConfigServer || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(triggerValidation);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'libConfigServer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	LimitExceededWarnings.cancel(change.document.uri);
	triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
documents.onDidClose(event => {
	LimitExceededWarnings.cancel(event.document.uri);
	cleanPendingValidation(event.document);
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

const pendingValidationRequests: { [uri: string]: NodeJS.Timer; } = {};
const validationDelayMs = 500;

function cleanPendingValidation(textDocument: TextDocument): void {
	const request = pendingValidationRequests[textDocument.uri];
	if (request) {
		clearTimeout(request);
		delete pendingValidationRequests[textDocument.uri];
	}
}

function triggerValidation(textDocument: TextDocument): void {
	cleanPendingValidation(textDocument);
	pendingValidationRequests[textDocument.uri] = setTimeout(() => {
		delete pendingValidationRequests[textDocument.uri];
		validateTextDocument(textDocument);
	}, validationDelayMs);
}

function validateTextDocument(textDocument: TextDocument, callback?: (diagnostics: Diagnostic[]) => void): void {
	const respond = (diagnostics: Diagnostic[]) => {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
		if (callback) {
			callback(diagnostics);
		}
	};
	if (textDocument.getText().length === 0) {
		respond([]); // ignore empty documents
		return;
	}
	const version = textDocument.version;

	let validator = new LibConfigValidation(Promise);

	validator.doValidation(textDocument).then(diagnostics => {
		setTimeout(() => {
			const currDocument = documents.get(textDocument.uri);
			if (currDocument && currDocument.version === version) {
				respond(diagnostics); // Send the computed diagnostics to VSCode.
			}
		}, 100);
	}, error => {
		connection.console.error(formatError(`Error while validating ${textDocument.uri}`, error));
	});
}

connection.onDidChangeWatchedFiles((change) => {
	// Monitored files have changed in VSCode
	let hasChanges = false;
	if (hasChanges) {
		documents.all().forEach(triggerValidation);
	}
});

connection.onFoldingRanges((params, token) => {
	return runSafe(() => {
		const document = documents.get(params.textDocument.uri);
		if (document) {
			return getFoldingRanges(document);
		}
		return null;
	}, null, `Error while computing folding ranges for ${params.textDocument.uri}`, token);
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
