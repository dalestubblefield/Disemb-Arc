// Main application entry point

import { loadData, saveBoxes } from './storage.js';
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
} from './utils.js';

// Application state
let boxes = [];
let canvas;

/**
 * Initialize the application
 */
async function init() {
  canvas = document.getElementById('canvas');
  const addBoxBtn = document.getElementById('add-box-btn');
  const importBtn = document.getElementById('import-btn');
  const fileInput = document.getElementById('file-input');

  // Load saved data
  const data = await loadData();
  boxes = data.boxes || [];

  // Render initial state
  render();

  // Setup add box button
  addBoxBtn.addEventListener('click', handleAddBox);

  // Setup import button
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleImport);

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
    const boxEl = renderBox(box, handlers);
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
  // Calculate position to avoid overlap
  const offset = boxes.length * 30;
  const x = 50 + (offset % 200);
  const y = 50 + (Math.floor(offset / 200) * 50);

  const newBox = createEmptyBox(x, y);
  boxes.push(newBox);
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
    const html = event.target.result;
    const items = parseBookmarksHtml(html);

    if (items.length === 0) {
      alert('No bookmarks found in the file.');
      return;
    }

    // Calculate position for the new box
    const offset = boxes.length * 30;
    const x = 50 + (offset % 200);
    const y = 50 + (Math.floor(offset / 200) * 50);

    // Get filename without extension for the box title
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    const newBox = createBoxFromBookmarks(items, title, x, y);
    boxes.push(newBox);
    save();
    render();
  };

  reader.readAsText(file);

  // Reset file input so the same file can be imported again
  e.target.value = '';
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
 * Save boxes to storage (debounced)
 */
const save = debounce(() => {
  saveBoxes(boxes);
}, 300);

/**
 * Find a box by ID
 */
function findBox(boxId) {
  return boxes.find((b) => b.id === boxId);
}

/**
 * Event handlers passed to components
 */
const handlers = {
  // Box handlers
  onPositionChange(boxId, x, y) {
    const box = findBox(boxId);
    if (box) {
      box.x = x;
      box.y = y;
      save();
    }
  },

  onSizeChange(boxId, width, height) {
    const box = findBox(boxId);
    if (box) {
      box.width = width;
      box.height = height;
      save();
    }
  },

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

  onToggleCollapse(boxId) {
    const box = findBox(boxId);
    if (box) {
      box.collapsed = !box.collapsed;
      save();
      render();
    }
  },

  onDelete(boxId) {
    boxes = boxes.filter((b) => b.id !== boxId);
    save();
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

  onDeleteItem(boxId, itemId) {
    const box = findBox(boxId);
    if (box) {
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
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
