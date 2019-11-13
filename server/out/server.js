"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const runner_1 = require("./utils/runner");
const libConfigFolding_1 = require("./folding/libConfigFolding");
const libConfigValidation_1 = require("./validation/libConfigValidation");
const path_1 = require("path");
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
connection.console.log('SERVER STARTED');
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new vscode_languageserver_1.TextDocuments();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
connection.onInitialize((params) => {
    let capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation);
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
        connection.client.register(vscode_languageserver_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});
var LimitExceededWarnings;
(function (LimitExceededWarnings) {
    const pendingWarnings = {};
    function cancel(uri) {
        const warning = pendingWarnings[uri];
        if (warning && warning.timeout) {
            clearTimeout(warning.timeout);
            delete pendingWarnings[uri];
        }
    }
    LimitExceededWarnings.cancel = cancel;
    function onResultLimitExceeded(uri, resultLimit, name) {
        return () => {
            let warning = pendingWarnings[uri];
            if (warning) {
                if (!warning.timeout) {
                    // already shown
                    return;
                }
                warning.features[name] = name;
                warning.timeout.refresh();
            }
            else {
                warning = { features: { [name]: name } };
                warning.timeout = setTimeout(() => {
                    connection.window.showInformationMessage(`${path_1.posix.basename(uri)}: For performance reasons, ${Object.keys(warning.features).join(' and ')} have been limited to ${resultLimit} items.`);
                    warning.timeout = undefined;
                }, 2000);
                pendingWarnings[uri] = warning;
            }
        };
    }
    LimitExceededWarnings.onResultLimitExceeded = onResultLimitExceeded;
})(LimitExceededWarnings || (LimitExceededWarnings = {}));
// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings = { maxNumberOfProblems: 1000 };
let globalSettings = defaultSettings;
// Cache the settings of all open documents
let documentSettings = new Map();
connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    }
    else {
        globalSettings = ((change.settings.libConfigServer || defaultSettings));
    }
    // Revalidate all open text documents
    documents.all().forEach(triggerValidation);
});
function getDocumentSettings(resource) {
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
const pendingValidationRequests = {};
const validationDelayMs = 500;
function cleanPendingValidation(textDocument) {
    const request = pendingValidationRequests[textDocument.uri];
    if (request) {
        clearTimeout(request);
        delete pendingValidationRequests[textDocument.uri];
    }
}
function triggerValidation(textDocument) {
    cleanPendingValidation(textDocument);
    pendingValidationRequests[textDocument.uri] = setTimeout(() => {
        delete pendingValidationRequests[textDocument.uri];
        validateTextDocument(textDocument);
    }, validationDelayMs);
}
function validateTextDocument(textDocument, callback) {
    const respond = (diagnostics) => {
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
    let validator = new libConfigValidation_1.LibConfigValidation(Promise);
    validator.doValidation(textDocument).then(diagnostics => {
        setTimeout(() => {
            const currDocument = documents.get(textDocument.uri);
            if (currDocument && currDocument.version === version) {
                respond(diagnostics); // Send the computed diagnostics to VSCode.
            }
        }, 100);
    }, error => {
        connection.console.error(runner_1.formatError(`Error while validating ${textDocument.uri}`, error));
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
    return runner_1.runSafe(() => {
        const document = documents.get(params.textDocument.uri);
        if (document) {
            return libConfigFolding_1.getFoldingRanges(document);
        }
        return null;
    }, null, `Error while computing folding ranges for ${params.textDocument.uri}`, token);
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map