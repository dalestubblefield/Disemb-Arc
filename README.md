# Disemb-Arc

A Chrome extension for Arc Browser users migrating to Chrome or anyone who wants to bring their Arc Spaces and bookmarks with them.

Import your Arc Browser sidebar directly into Chrome and keep the spatial organization you're used to. Each Arc Space becomes an accordion panel on your new tab page, synced with Chrome's native bookmarks.

## Why Disemb-Arc?

- **Migrating from Arc?** Bring your carefully organized Spaces and bookmarks with you
- **Using both browsers?** Keep your bookmarks in sync by re-importing periodically
- **Miss Arc's UI?** Get a similar spatial bookmark experience in Chrome

## Features

- **Arc import** - Import Arc's StorableSidebar.json directly, preserving Space colors and folder structure
- **Chrome sync** - Two-way sync with Chrome's native bookmarks bar
- **Accordion layout** - Spaces displayed as expandable panels, one expanded at a time
- **Re-import without duplicates** - Re-import your Arc data anytime to sync new bookmarks
- **Color customization** - Each space keeps its Arc color or you can customize it
- **Folder hierarchy** - Full nested folder support with expand/collapse
- **Drag-and-drop** - Reorder items within spaces or drag between spaces
- **Context menus** - Right-click to add folders, bookmarks, rename, or delete
- **Inline editing** - Double-click to edit names and URLs
- **Light/dark theme** - Automatically follows system preference
- **Persistent storage** - All changes saved automatically

## Installation

### From Chrome Web Store

1. Visit the [Disemb-Arc Chrome Web Store page](https://chrome.google.com/webstore)
2. Click **Add to Chrome**
3. Open a new tab to see your new tab page

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the project folder
6. Open a new tab to see your new tab page

## Usage

- Click the **+** button to create a new space
- Click a **collapsed panel** to expand it
- **Double-click** titles or bookmark names to edit
- **Drag** bookmarks or folders to reorder within a space
- **Drag** items to collapsed panels to move them between spaces
- **Right-click** items for context menu (rename, add folder, add bookmark, delete)
- Click a **bookmark** to open it in a new tab
- Click the **color button** in the header to change the space accent color
- Use **Expand All / Collapse All** buttons to toggle all folders in a space

## Importing from Arc Browser

Click the **?** button for import instructions, or follow these steps:

### macOS

1. Open Finder
2. Press `Cmd + Shift + G` to open "Go to Folder"
3. Paste this path: `~/Library/Application Support/Arc/`
4. Find and copy the file `StorableSidebar.json` to a convenient location
5. Click **Import** in this extension and select the copied file
6. Each Arc Space will become a separate accordion panel

### Windows

1. Open File Explorer
2. Navigate to: `%LOCALAPPDATA%\Packages\TheBrowserCompany.Arc*\LocalCache\Local\Arc\`
3. Find and copy the file `StorableSidebar.json` to a convenient location
4. Click **Import** in this extension and select the copied file

> **Tip:** You can re-import your StorableSidebar.json at any time to sync new bookmarks and spaces from Arc without creating duplicates.

> **Note:** You can also import standard HTML bookmark files exported from Chrome, Firefox, Safari, or other browsers.

## Chrome Bookmarks Sync

Disemb-Arc automatically syncs your spaces with Chrome's native bookmarks bar:

- Each space creates a folder in your bookmarks bar
- Changes in Disemb-Arc sync to Chrome bookmarks
- Changes in Chrome bookmarks sync back to Disemb-Arc
- Delete a space and its Chrome bookmark folder is also removed

## License

MIT License - see [LICENSE](LICENSE) for details.
