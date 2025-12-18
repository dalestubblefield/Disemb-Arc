// Main application entry point

import { loadData, saveBoxes, saveExpandedSpaceId } from './storage.js';
import { renderBox } from './box.js';
import {
  createEmptyBox,
  createFolder,
  createBookmark,
  findItemById,
  findParentById,
  removeItemById,
  debounce,
  parseBookmarksHtml,
  createBoxFromBookmarks,
  parseArcJson,
  createBoxesFromArcSpaces,
  generateId,
} from './utils.js';
import {
  initSync,
  syncAllSpacesToChrome,
  syncSpaceToChrome,
  removeSpaceFromChrome,
  removeItemFromChrome,
  findItemByChromeId,
  findParentSpace,
  removeItemByChromeId,
} from './sync.js';

// Application state
let boxes = [];
let expandedSpaceId = null;
let canvas;

/**
 * Initialize the application
 */
async function init() {
  canvas = document.getElementById('canvas');
  const addBoxBtn = document.getElementById('add-box-btn');
  const importBtn = document.getElementById('import-btn');
  const fileInput = document.getElementById('file-input');
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const modalClose = document.getElementById('modal-close');

  // Load saved data
  const data = await loadData();
  boxes = data.boxes || [];
  expandedSpaceId = data.expandedSpaceId || (boxes.length > 0 ? boxes[0].id : null);

  // Initialize Chrome bookmarks sync
  initSync(handleChromeBookmarkChange);

  // Sync existing spaces to Chrome bookmarks
  if (boxes.length > 0) {
    boxes = await syncAllSpacesToChrome(boxes);
    saveBoxes(boxes);
  }

  // Render initial state
  render();

  // Setup add box button
  addBoxBtn.addEventListener('click', handleAddBox);

  // Setup import button
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleImport);

  // Setup help modal
  helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
  modalClose.addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });

  // Setup tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Setup copy buttons
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const path = btn.dataset.path;
      try {
        await navigator.clipboard.writeText(path);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });

  // Handle keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * Render all boxes
 */
function render() {
  canvas.innerHTML = '';

  if (boxes.length === 0) {
    renderEmptyState();
    return;
  }

  boxes.forEach((box) => {
    const isExpanded = box.id === expandedSpaceId;
    const boxEl = renderBox(box, handlers, isExpanded);
    canvas.appendChild(boxEl);
  });
}

/**
 * Render empty state
 */
function renderEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <div class="empty-state-icon">&#128230;</div>
    <div class="empty-state-text">No bookmark boxes yet</div>
    <div class="empty-state-hint">Click the + button to create your first box</div>
  `;
  canvas.appendChild(empty);
}

/**
 * Handle adding a new box
 */
function handleAddBox() {
  const newBox = createEmptyBox();
  boxes.push(newBox);
  expandedSpaceId = newBox.id; // Expand the newly created box
  saveExpandedSpaceId(expandedSpaceId);
  save();
  render();
}

/**
 * Handle importing bookmarks from file
 */
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    const isJson = file.name.endsWith('.json');

    if (isJson) {
      // Handle Arc's StorableSidebar.json format
      handleArcImport(content);
    } else {
      // Handle standard HTML bookmark format
      handleHtmlImport(content, file.name);
    }
  };

  reader.readAsText(file);

  // Reset file input so the same file can be imported again
  e.target.value = '';
}

/**
 * Handle HTML bookmark file import
 */
function handleHtmlImport(html, filename) {
  const items = parseBookmarksHtml(html);

  if (items.length === 0) {
    alert('No bookmarks found in the file.');
    return;
  }

  // Get filename without extension for the box title
  const title = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  const newBox = createBoxFromBookmarks(items, title);
  boxes.push(newBox);
  expandedSpaceId = newBox.id; // Expand the imported box
  saveExpandedSpaceId(expandedSpaceId);
  save();
  render();
}

/**
 * Handle Arc Browser JSON import
 */
function handleArcImport(jsonContent) {
  try {
    const spaces = parseArcJson(jsonContent);

    if (spaces.length === 0) {
      alert('No bookmarks found in the Arc data file. Make sure you selected the correct StorableSidebar.json file.');
      return;
    }

    const newBoxes = createBoxesFromArcSpaces(spaces);
    boxes.push(...newBoxes);
    // Expand the first imported space
    if (newBoxes.length > 0) {
      expandedSpaceId = newBoxes[0].id;
      saveExpandedSpaceId(expandedSpaceId);
    }
    save();
    render();

    alert(`Successfully imported ${spaces.length} space(s) from Arc Browser!`);
  } catch (err) {
    console.error('Error parsing Arc JSON:', err);
    alert('Error parsing the file. Make sure you selected a valid Arc StorableSidebar.json file.');
  }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(e) {
  // Delete selected item with Delete or Backspace key
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const activeEl = document.activeElement;
    if (activeEl.tagName === 'INPUT') return;
    // Could implement selection state here
  }
}

/**
 * Handle changes from Chrome bookmarks (two-way sync)
 */
async function handleChromeBookmarkChange(eventType, data) {
  const { id, bookmark, changeInfo, removeInfo, moveInfo } = data;

  switch (eventType) {
    case 'created': {
      // A bookmark was created in Chrome - add it to our data if it's in a synced folder
      const parentSpace = findParentSpace(boxes, bookmark.parentId);
      if (parentSpace) {
        // Find the parent item (folder) in our structure
        const parentResult = findItemByChromeId(boxes, bookmark.parentId);
        const newItem = bookmark.url
          ? { id: generateId(), type: 'bookmark', name: bookmark.title, url: bookmark.url, chromeId: id }
          : { id: generateId(), type: 'folder', name: bookmark.title, expanded: true, children: [], chromeId: id };

        if (parentResult && parentResult.type === 'folder') {
          parentResult.item.children = parentResult.item.children || [];
          parentResult.item.children.push(newItem);
        } else if (parentResult && parentResult.type === 'space') {
          parentResult.item.items.push(newItem);
        }
        saveBoxes(boxes);
        render();
      }
      break;
    }

    case 'removed': {
      // A bookmark was removed in Chrome - remove from our data
      const result = findItemByChromeId(boxes, id);
      if (result) {
        if (result.type === 'space') {
          // A space folder was removed
          const boxToRemove = result.item;
          boxes = boxes.filter((b) => b.id !== boxToRemove.id);
          if (expandedSpaceId === boxToRemove.id) {
            expandedSpaceId = boxes.length > 0 ? boxes[0].id : null;
            saveExpandedSpaceId(expandedSpaceId);
          }
        } else {
          // An item was removed - find its parent and remove it
          for (const box of boxes) {
            if (removeItemByChromeId(box.items, id)) break;
          }
        }
        saveBoxes(boxes);
        render();
      }
      break;
    }

    case 'changed': {
      // A bookmark was changed in Chrome - update our data
      const result = findItemByChromeId(boxes, id);
      if (result) {
        if (result.type === 'space') {
          result.item.title = changeInfo.title || result.item.title;
        } else {
          result.item.name = changeInfo.title || result.item.name;
          if (changeInfo.url && result.item.type === 'bookmark') {
            result.item.url = changeInfo.url;
          }
        }
        saveBoxes(boxes);
        render();
      }
      break;
    }

    case 'moved': {
      // A bookmark was moved in Chrome - update our structure
      // This is complex - for now, just re-sync
      // TODO: Implement proper move handling
      break;
    }
  }
}

/**
 * Save boxes to storage and sync to Chrome (debounced)
 */
const save = debounce(async () => {
  // Sync all spaces to Chrome
  boxes = await syncAllSpacesToChrome(boxes);
  saveBoxes(boxes);
}, 300);

/**
 * Find a box by ID
 */
function findBox(boxId) {
  return boxes.find((b) => b.id === boxId);
}

/**
 * Recursively set expanded state on all folders
 */
function setAllFoldersExpanded(items, expanded) {
  for (const item of items) {
    if (item.type === 'folder') {
      item.expanded = expanded;
      if (item.children && item.children.length > 0) {
        setAllFoldersExpanded(item.children, expanded);
      }
    }
  }
}

/**
 * Event handlers passed to components
 */
const handlers = {
  // Accordion handlers
  onSelectSpace(boxId) {
    expandedSpaceId = boxId;
    saveExpandedSpaceId(boxId);
    render();
  },

  // Box handlers
  onTitleChange(boxId, title) {
    const box = findBox(boxId);
    if (box) {
      box.title = title;
      save();
    }
  },

  onColorChange(boxId, color) {
    const box = findBox(boxId);
    if (box) {
      box.color = color;
      save();
      render();
    }
  },

  onExpandAllFolders(boxId) {
    const box = findBox(boxId);
    if (box) {
      setAllFoldersExpanded(box.items, true);
      save();
      render();
    }
  },

  onCollapseAllFolders(boxId) {
    const box = findBox(boxId);
    if (box) {
      setAllFoldersExpanded(box.items, false);
      save();
      render();
    }
  },

  async onDelete(boxId) {
    const box = findBox(boxId);
    if (box) {
      // Remove from Chrome bookmarks
      await removeSpaceFromChrome(box);
    }
    boxes = boxes.filter((b) => b.id !== boxId);
    // If the deleted box was expanded, expand the first remaining box
    if (expandedSpaceId === boxId) {
      expandedSpaceId = boxes.length > 0 ? boxes[0].id : null;
      saveExpandedSpaceId(expandedSpaceId);
    }
    saveBoxes(boxes);
    render();
  },

  // Tree handlers
  onToggleExpand(boxId, itemId) {
    const box = findBox(boxId);
    if (box) {
      const item = findItemById(box.items, itemId);
      if (item && item.type === 'folder') {
        item.expanded = !item.expanded;
        save();
        render();
      }
    }
  },

  onItemNameChange(boxId, itemId, name) {
    const box = findBox(boxId);
    if (box) {
      const item = findItemById(box.items, itemId);
      if (item) {
        item.name = name;
        save();
      }
    }
  },

  onItemUrlChange(boxId, itemId, url) {
    const box = findBox(boxId);
    if (box) {
      const item = findItemById(box.items, itemId);
      if (item && item.type === 'bookmark') {
        item.url = url;
        save();
      }
    }
  },

  onAddFolder(boxId, parentId) {
    const box = findBox(boxId);
    if (box) {
      const folder = createFolder();
      if (parentId) {
        const parent = findItemById(box.items, parentId);
        if (parent && parent.type === 'folder') {
          parent.children = parent.children || [];
          parent.children.push(folder);
          parent.expanded = true;
        }
      } else {
        box.items.push(folder);
      }
      save();
      render();
    }
  },

  onAddBookmark(boxId, parentId) {
    const box = findBox(boxId);
    if (box) {
      const bookmark = createBookmark();
      if (parentId) {
        const parent = findItemById(box.items, parentId);
        if (parent && parent.type === 'folder') {
          parent.children = parent.children || [];
          parent.children.push(bookmark);
          parent.expanded = true;
        }
      } else {
        box.items.push(bookmark);
      }
      save();
      render();
    }
  },

  async onDeleteItem(boxId, itemId) {
    const box = findBox(boxId);
    if (box) {
      const item = findItemById(box.items, itemId);
      if (item) {
        // Remove from Chrome bookmarks
        await removeItemFromChrome(item);
      }
      removeItemById(box.items, itemId);
      save();
      render();
    }
  },

  onMoveItem(sourceBoxId, itemId, targetBoxId, targetParentId) {
    const sourceBox = findBox(sourceBoxId);
    const targetBox = findBox(targetBoxId);

    if (!sourceBox || !targetBox) return;

    // Find and remove the item from source
    const item = findItemById(sourceBox.items, itemId);
    if (!item) return;

    // Don't allow moving a folder into itself
    if (item.type === 'folder' && targetParentId === itemId) return;

    // Remove from source
    removeItemById(sourceBox.items, itemId);

    // Add to target
    if (targetParentId) {
      const targetParent = findItemById(targetBox.items, targetParentId);
      if (targetParent && targetParent.type === 'folder') {
        targetParent.children = targetParent.children || [];
        targetParent.children.push(item);
        targetParent.expanded = true;
      }
    } else {
      targetBox.items.push(item);
    }

    save();
    render();
  },

  onReorderItem(sourceBoxId, itemId, targetBoxId, targetItemId, position) {
    const sourceBox = findBox(sourceBoxId);
    const targetBox = findBox(targetBoxId);

    if (!sourceBox || !targetBox) return;

    // Find the item to move
    const item = findItemById(sourceBox.items, itemId);
    if (!item) return;

    // Find the target item and its parent
    const targetItem = findItemById(targetBox.items, targetItemId);
    if (!targetItem) return;

    // Find parent array of target item
    const targetParent = findParentById(targetBox.items, targetItemId);
    const targetArray = targetParent ? targetParent.children : targetBox.items;

    // Don't allow moving a folder into itself
    if (item.type === 'folder' && isDescendant(item, targetItemId)) return;

    // Remove from source
    removeItemById(sourceBox.items, itemId);

    // Find index of target item in its parent array
    let targetIndex = targetArray.findIndex((i) => i.id === targetItemId);
    if (targetIndex === -1) return;

    // Adjust index based on position
    if (position === 'after') {
      targetIndex += 1;
    }

    // Insert at the correct position
    targetArray.splice(targetIndex, 0, item);

    save();
    render();
  },
};

/**
 * Check if targetId is a descendant of item
 */
function isDescendant(item, targetId) {
  if (!item.children) return false;
  for (const child of item.children) {
    if (child.id === targetId) return true;
    if (isDescendant(child, targetId)) return true;
  }
  return false;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
