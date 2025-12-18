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
  parseArcJson,
  createBoxesFromArcSpaces,
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
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const modalClose = document.getElementById('modal-close');

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

  // Calculate position for the new box
  const offset = boxes.length * 30;
  const x = 50 + (offset % 200);
  const y = 50 + (Math.floor(offset / 200) * 50);

  // Get filename without extension for the box title
  const title = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  const newBox = createBoxFromBookmarks(items, title, x, y);
  boxes.push(newBox);
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

    // Calculate starting position based on existing boxes
    const startX = 50 + (boxes.length % 3) * 340;
    const startY = 50 + Math.floor(boxes.length / 3) * 400;

    const newBoxes = createBoxesFromArcSpaces(spaces, startX, startY);
    boxes.push(...newBoxes);
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
