# sdl-memory-viewer
This vscode extension hooks into the debugger for a C/C++ SDL project and displays any Surfaces or Textures in a side pane

https://user-images.githubusercontent.com/2467473/125012485-4aa43d00-e038-11eb-952a-5f4375aeffab.mp4

## Usage
Open the command pallete (cmd+shift+P) and run "Open SDL Memory Viewer", then start debugging on your project.
When on a breakpoint and hovering over a variable, or expanding a variable in the memory tree, the pane's canvas will be updated with the pixel data from the app's memory.

## Todo
- Detect surface format instead of defaulting to RGBA
- Automatically pop up pane when extension active
- More instructions on installing / debugging an SDL program
- Get extension in vscode Marketplace

