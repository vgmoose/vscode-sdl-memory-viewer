import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let panel: vscode.WebviewPanel;

	const getWebviewContent = (pixels: (Array<number> | null) = null, width = 0, height = 0) => {
		return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>SDL Preview</title>
				<style>
					input[readonly] {
						width: 500px;
						padding: 5px;
						font-family: monospace;
						border: 1px solid darkgray;
						border-radius: 5px;
					}
					div {
						margin: 10px;
					}
					canvas {
						background-color: #888;
						background-image:
						linear-gradient(45deg, #555 25%, transparent 25%), 
						linear-gradient(135deg, #555 25%, transparent 25%),
						linear-gradient(45deg, transparent 75%, #555 75%),
						linear-gradient(135deg, transparent 75%, #555 75%);
						background-size:25px 25px;
						background-position:0 0, 12.5px 0, 12.5px -12.5px, 0px 12.5px; Must be half of one side of the square
					}
				</style>
			</head>
			<body>
				<div style="width: 100%; text-align: center">
					<p>
						Hover over an SDL_Surface* or SDL_Texture* while paused with the debugger to preview it here.
						<!-- Alternatively, run the below command manually and select the file yourself. -->
					</p>
					${pixels ? "" :
						`<input type="text" readonly value="memory read -o /tmp/outfile.bin -b --force <offset> <offset>+<size>" />
						<div>
							<input id="browse" type="file" value="Browse..." />
							<select hidden id="select">
							</select>
						</div>`
					}
					<canvas id="main" width=${width || 150} height=${height || 150} style="border: 3px dashed lightgray">canvas not supported, a permission error may have occurred</canvas>
				</div>
			</body>
			<script>
			let canvas = document.getElementById("main");
			let select = document.getElementById("select");

			let guesses = [];
			let data;

			const resize = () => {
				if (select) {
					select.hidden = false;
				}
				// grab the passed width and height, if they're present
				const [w, h] = ${(width && height) ? 
					`[${width}, ${height}]` :
					`guesses[select.selectedIndex]`
				};
				canvas.width = w;
				canvas.height = h;
				return [w, h];
			}

			const guessSizes = length => {
				// assume 4 bytes per pixel
				const pixelCount = length / 4;
				for (let x=2; x<pixelCount; x++) {
					let divisor = pixelCount / x;
					if (parseInt(divisor) == divisor) {
						guesses.push([
							divisor,
							pixelCount / divisor
						]);
					}
				}
				return guesses;
			}

			const updateImage = () => {
				const [width, height] = resize();
				var ctx = canvas.getContext('2d');
				let pixels = ctx.createImageData(width, height);
				let x = 0;
				for (let x=0; x<data.length; x++) {
					pixels.data[x] = data[x];
				}
				// TODO: check format for RGBA knowledge
				// pixels.data[x+3] = pixel & 0xff;
				// pixels.data[x+2] = (pixel >> 8) & 0xff;
				// pixels.data[x+1] = (pixel >> 16) & 0xff;
				// pixels.data[x+0] = (pixel >> 24) & 0xff;
				// x += 4;

				ctx.putImageData(pixels, 0, 0);
			}

			if (select) {
				select.onchange = updateImage;
			}

			const chooseImage = binaryData => {
				const guesses = guessSizes(binaryData.byteLength);
				data = binaryData;

				select.innerHTML = "";
				for (let guess of guesses) {
					const [w, h] = guess;
					select.appendChild(new Option(""+w+"x"+h, ""+w+"x"+h));
				}
				select.selectedIndex = parseInt(guesses.length / 2);
				
				updateImage();
			}

			const browse = document.getElementById("browse");
			if (browse) {
				browse.onchange = e => {
					var reader = new FileReader();
					reader.onload = function() {
						chooseImage(new Uint8Array(reader.result));
					}
					reader.readAsArrayBuffer(e.target.files[0]);
				};
			}

			${pixels ? `
				// load from pixel data
				// TODO: event listener, or socket, or something else instead of stringifying
				data = new Uint8Array([${pixels}]);
				updateImage();
			` : ""}

			</script>
		</html>`;
	};

	const showPane = () => {
		panel = vscode.window.createWebviewPanel(
			'sdlPreview',
			'SDL Preview',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);
		// And set its HTML content
		panel.webview.html = getWebviewContent();
	};

	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker(session) {
			
			return {
				onWillStartSession: () => vscode.window.showInformationMessage("Loaded sdl-memory-viewer extension", "Open Preview Pane"),
				onWillReceiveMessage: m => console.log(`===> ${JSON.stringify(m, undefined, 2)}`),
				onDidSendMessage: async (m) => {
					const { type, success, command, body } = m;

					if (type === "response" && command === "variables" && success === true) {
						const { variables } = body;

						let width = 0, height = 0, offset = 0;

						for (let v of variables) {
							const { name, type, value, memoryReference } = v;
							if (name === "w" && type === "int") {
								width = value;
							} else if (name === "h" && type === "int") {
								height = value;
							} else if (name === "pixels" && type === "void *") {
								offset = memoryReference;
							}
						}

						// TODO: handle other formats, for now assume 4 bytes per pixel, RGBA

						// look up the memory address using the debug console
						const size = width * height * 4;

						if (size === 0) {
							return;
						}
						
						// get a tmp file in our extensions dir
						// const tmpPath =  `${vscode.workspace.workspaceFolders[0].uri.path}/outfile.bin`;
						// TODO: don't use "/" on windows?
						const tmpPath = "/tmp/sdl-preview-data.bin";

						const cmd = `-exec memory read -o ${tmpPath} -b --force ${offset} ${offset}+${size}`;

						const resp = await vscode.debug.activeDebugSession?.customRequest("evaluate", {
							expression: cmd,
							context: "repl"
						});

						// wrote the file, now let's read it
						// TODO: check for resp success here
						const data = Array.from(await vscode.workspace.fs.readFile(vscode.Uri.file(tmpPath)));
						
						// update our pane
						panel.webview.html = getWebviewContent(data, width, height);
					}
				},
				onWillStopSession: () => console.log(`stop: ${session.id}`),
				onError: err => console.log(`error: ${err}`),
				onExit: (code, signal) => console.log(`exit: ${code}`)
			};
		}
	});

	let disposable = vscode.commands.registerCommand('sdl-memory-viewer.openViewer', () => showPane());
	context.subscriptions.push(disposable);

}
// this method is called when your extension is deactivated
export function deactivate() {}
