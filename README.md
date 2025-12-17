# Arc Like New Tab Page

A Chrome extension that replaces the new tab page with a customizable bookmark canvas featuring draggable boxes containing file-tree-style bookmark hierarchies. Inspired by Arc Browser.

## Features

- **Draggable boxes** - Freely position boxes anywhere on the canvas
- **Resizable boxes** - Drag edges or corners to resize
- **Collapsible boxes** - Collapse/expand entire boxes
- **Color customization** - Choose accent color for each box
- **File tree structure** - Organize bookmarks in folders with nested hierarchy
- **Inline editing** - Double-click to edit names and titles
- **Drag-and-drop** - Reorder items within and between folders
- **Light/dark theme** - Automatically follows system preference
- **Persistent storage** - All changes saved automatically

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the project folder
6. Open a new tab to see your new tab page

## Usage

- Click the **+** button to create a new box
- **Drag** the box header to move it
- **Drag** edges/corners to resize
- **Double-click** titles or bookmark names to edit
- **Right-click** items for context menu (add folder, add bookmark, delete)
- Click a **bookmark** to open it in a new tab
- Click the **color dot** in the header to change the box accent color
- Click the **arrow** to collapse/expand a box
- Click the **Import** button to import bookmarks from a file

## Importing Bookmarks from Arc Browser

Each Arc Space has its own set of bookmarks. To export bookmarks from a Space:

1. In Arc's address bar, type `arc://bookmarks/` and press Enter
2. On the Bookmarks page, look for the three dots icon (next to the search box)
3. Click the three dots and select **Export bookmarks**
4. Save the HTML file to your computer
5. Repeat for each Space you want to export

Then import each file using the **Import** button in this extension. Each imported file creates a new box.

> Note: This also works with bookmark exports from Chrome, Firefox, Safari, and other browsers that use the standard HTML bookmark format.

## License

MIT License - see [LICENSE](LICENSE) for details.
