import * as vscode from 'vscode';

const cats = {
	'Coding Cat': 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
	'Compiling Cat': 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif',
	'Testing Cat': 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif'
};

// https://code.visualstudio.com/api/extension-guides/tree-view
class TestDataProvider implements vscode.TreeDataProvider<TestItem> {
    getTreeItem(element: TestItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TestItem): Thenable<TestItem[]> {
        if (element === undefined) {
            // Fetch and return the root test elements here
            // For demonstration, returning hardcoded items
	    // Hier müssen wir dann json laden
            return Promise.resolve([new TestItem('Test 1'), new TestItem('Test 2')]);
        }

        // Return children of the given element here
        return Promise.resolve([]);
    }
}

class TestItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label);
        // Additional properties and methods can be added as needed
    }
}


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('HaaC.start', () => {
			HaaCPanel.createOrShow(context.extensionUri);
		})
		
	);

	const testDataProvider = new TestDataProvider();
    vscode.window.registerTreeDataProvider('autogradingTests', testDataProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('HaaC.doRefactor', () => {
			if (HaaCPanel.currentPanel) {
				HaaCPanel.currentPanel.doRefactor();
			}
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(HaaCPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				HaaCPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

/**
 * Manages cat coding webview panels
 */
class HaaCPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: HaaCPanel | undefined;

	public static readonly viewType = 'HaaC';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (HaaCPanel.currentPanel) {
			HaaCPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			HaaCPanel.viewType,
			'Autograding (Haac)',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		HaaCPanel.currentPanel = new HaaCPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		HaaCPanel.currentPanel = new HaaCPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						//vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		HaaCPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;

		// Vary the webview's content based on where it is located in the editor.
		switch (this._panel.viewColumn) {
			case vscode.ViewColumn.Two:
				this._updateForCat(webview, 'Compiling Cat');
				return;

			case vscode.ViewColumn.Three:
				this._updateForCat(webview, 'Testing Cat');
				return;

			case vscode.ViewColumn.One:
			default:
				this._updateForCat(webview, 'Coding Cat');
				return;
		}
	}

	private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
		this._panel.title = catName;
		this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
	}

	private _getHtmlForWebview(webview: vscode.Webview, catGifPath: string) {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
		const stylesPathStylePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css');

		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const stylesStyleUri = webview.asWebviewUri(stylesPathStylePath);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		// FIXME: use separate template file ?
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
		-->
		<!-- macht Probleme bzgl unseres Codes
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
		-->
		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link href="${stylesResetUri}" rel="stylesheet">
		<link href="${stylesMainUri}" rel="stylesheet">
		<link href="${stylesStyleUri}" rel="stylesheet">
		<script nonce="${nonce}" src="${scriptUri}"></script>
		
		<title>Edit JSON</title>
		</head>
		<body>
		<h1>Edit JSON Data</h1>
		<div>
		<button onclick="setViewConfig();">Config</button>
		<button onclick="setViewTests();">Tests</button>
		</div>
		<div id="form-container">
		<div id="config">
		<div class="form-group">
		  <label for="repo">Repo:</label>
		  <input type="text" id="repo" name="repo">
		</div>
		
		<div class="form-group">
		  <label for="introduction">Introduction:</label>
		  <input type="text" id="introduction" name="introduction" value="">
		</div>
		
		<div class="form-group">
		  <label for="logo_url">Logo URL:</label>
		  <input type="url" id="logo_url" name="logo_url" value="">
		  <div class="image-preview" id="image-preview">
			<!-- Image preview will be displayed here -->
		  </div>
		</div>
		
		<div class="form-group">
		  <label for="timeframe">Timeframe:</label>
		  <input type="text" id="timeframe" name="timeframe" value="">
		</div>
		</div>

		<!-- new "tab" -->
		<div id="tests">
		<h3>Tests</h3>

<div class="form-group">
  <label for="title">Title:</label>
  <input type="text" id="title" name="title" value="">
</div>

<div class="form-group">
  <label for="name">Name:</label>
  <input type="text" id="name" name="name" value="">
</div>

<div class="form-group">
  <label for="feedback">Feedback:</label>
  <input type="text" id="feedback" name="feedback" value="">
</div>

<div class="form-group">
  <label for="urls">URLs (comma-separated):</label>
  <input type="text" id="urls" name="urls" value="">
</div>

<div class="form-group">
  <label for="keywords">Keywords (comma-separated):</label>
  <input type="text" id="keywords" name="keywords" value="">
</div>

<div class="form-group">
  <label for="type">Type:</label>
  <select id="type" name="type">
    <option value="JSON">JSON</option>
    <option value="YAML">YAML</option>
    <option value="CloudFormation">CloudFormation</option>
  </select>
</div>

<div class="form-group">
  <label for="run">Run:</label>
  <input type="text" id="run" name="run" value="">
</div>

<div class="form-group">
  <label for="file">File:</label>
  <input type="text" id="file" name="file" value="">
</div>

<div class="form-group">
  <label for="output">Output:</label>
  <input type="text" id="output" name="output" value="">
</div>

<div class="form-group">
  <label for="comparison">Comparison:</label>
  <input type="text" id="comparison" name="comparison" value="">
</div>

<div class="form-group">
  <label for="points">Points:</label>
  <input type="number" id="points" name="points" value="">
</div>

<button onclick="updateJSON()">Save Changes</button>
		</div>
		</div>
		</body>
		</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
