# sdl-memory-viewer
This vscode extension hooks into the debugger for a C/C++ SDL project and displays any Surfaces or Textures in a side pane

## Usage
Open the command pallete (cmd+shift+P) and run "Open SDL Memory Viewer", then start debugging on your project.
When on a breakpoint and hovering over a variable, or expanding a variable in the memory tree, the pane's canvas will be updated with the pixel data from the app's memory.

## Todo
- Detect surface format instead of defaulting to RGBA
- Automatically pop up pane when extension active
- More instructions on installing / debugging an SDL program
- Get extension in vscode Marketplace

