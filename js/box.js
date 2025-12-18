// Box component - handles rendering of accordion panels

import { COLORS } from './utils.js';
import { renderTree } from './tree.js';

/**
 * Render an accordion panel (replaces floating box)
 */
export function renderBox(box, handlers, isExpanded = false) {
  const el = document.createElement('div');
  el.className = 'accordion-panel' + (isExpanded ? ' expanded' : ' collapsed');
  el.dataset.id = box.id;
  el.style.setProperty('--box-accent', box.color);

  if (isExpanded) {
    renderExpandedPanel(el, box, handlers);
  } else {
    renderCollapsedPanel(el, box, handlers);
  }

  return el;
}

/**
 * Render collapsed panel (narrow strip with vertical title)
 */
function renderCollapsedPanel(el, box, handlers) {
  const header = document.createElement('div');
  header.className = 'accordion-header collapsed';

  // Color indicator dot
  const colorDot = document.createElement('span');
  colorDot.className = 'accordion-color-dot';
  colorDot.style.backgroundColor = box.color;

  // Vertical title
  const title = document.createElement('span');
  title.className = 'accordion-title-vertical';
  title.textContent = box.title;
  title.title = box.title;

  header.appendChild(colorDot);
  header.appendChild(title);
  el.appendChild(header);

  // Click to expand
  el.addEventListener('click', (e) => {
    // Don't expand if this was a drop
    if (!el.classList.contains('drag-over')) {
      handlers.onSelectSpace(box.id);
    }
  });

  // Setup drop zone for cross-space moves
  setupPanelDropZone(el, box, handlers);
}

/**
 * Render expanded panel (full content with tree)
 */
function renderExpandedPanel(el, box, handlers) {
  // Header
  const header = document.createElement('div');
  header.className = 'accordion-header expanded';

  // Color button
  const colorBtn = document.createElement('button');
  colorBtn.className = 'box-color-btn';
  colorBtn.style.backgroundColor = box.color;
  colorBtn.title = 'Change color';
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(colorBtn, box.color, (newColor) => {
      handlers.onColorChange(box.id, newColor);
    });
  });

  // Title input
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'accordion-title';
  titleInput.value = box.title;
  titleInput.addEventListener('change', () => {
    handlers.onTitleChange(box.id, titleInput.value);
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') titleInput.blur();
  });

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'box-delete-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.title = 'Delete space';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Delete this space?')) {
      handlers.onDelete(box.id);
    }
  });

  header.appendChild(colorBtn);
  header.appendChild(titleInput);
  header.appendChild(deleteBtn);

  // Content area with tree
  const content = document.createElement('div');
  content.className = 'accordion-content';

  // Add item buttons (at top)
  const addBtns = document.createElement('div');
  addBtns.className = 'tree-add-btns';

  const addFolderBtn = document.createElement('button');
  addFolderBtn.className = 'tree-add-btn';
  addFolderBtn.textContent = '+ Folder';
  addFolderBtn.addEventListener('click', () => {
    handlers.onAddFolder(box.id, null);
  });

  const addBookmarkBtn = document.createElement('button');
  addBookmarkBtn.className = 'tree-add-btn';
  addBookmarkBtn.textContent = '+ Bookmark';
  addBookmarkBtn.addEventListener('click', () => {
    handlers.onAddBookmark(box.id, null);
  });

  // Expand/Collapse all buttons
  const expandAllBtn = document.createElement('button');
  expandAllBtn.className = 'tree-add-btn tree-toggle-btn';
  expandAllBtn.textContent = 'Expand All';
  expandAllBtn.title = 'Expand all folders';
  expandAllBtn.addEventListener('click', () => {
    handlers.onExpandAllFolders(box.id);
  });

  const collapseAllBtn = document.createElement('button');
  collapseAllBtn.className = 'tree-add-btn tree-toggle-btn';
  collapseAllBtn.textContent = 'Collapse All';
  collapseAllBtn.title = 'Collapse all folders';
  collapseAllBtn.addEventListener('click', () => {
    handlers.onCollapseAllFolders(box.id);
  });

  addBtns.appendChild(addFolderBtn);
  addBtns.appendChild(addBookmarkBtn);
  addBtns.appendChild(expandAllBtn);
  addBtns.appendChild(collapseAllBtn);
  content.appendChild(addBtns);

  // Render tree
  const tree = renderTree(box.items, box.id, box.color, handlers);
  content.appendChild(tree);

  el.appendChild(header);
  el.appendChild(content);
}

/**
 * Show color picker popover
 */
function showColorPicker(anchorEl, currentColor, onSelect) {
  // Remove any existing picker
  const existing = document.querySelector('.color-picker');
  if (existing) existing.remove();

  const picker = document.createElement('div');
  picker.className = 'color-picker';

  const rect = anchorEl.getBoundingClientRect();
  picker.style.left = `${rect.left}px`;
  picker.style.top = `${rect.bottom + 8}px`;

  COLORS.forEach((color) => {
    const option = document.createElement('button');
    option.className = 'color-picker-option' + (color === currentColor ? ' selected' : '');
    option.style.backgroundColor = color;
    option.addEventListener('click', () => {
      onSelect(color);
      picker.remove();
    });
    picker.appendChild(option);
  });

  document.body.appendChild(picker);

  // Close picker when clicking outside
  const closeHandler = (e) => {
    if (!picker.contains(e.target) && e.target !== anchorEl) {
      picker.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

/**
 * Setup drop zone on accordion panel for cross-space moves
 */
function setupPanelDropZone(el, box, handlers) {
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });

  el.addEventListener('dragleave', (e) => {
    // Only remove if actually leaving the panel
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('drag-over');
    }
  });

  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      // Move item to this space (root level)
      handlers.onMoveItem(data.sourceBoxId, data.itemId, box.id, null);
    } catch (err) {
      console.error('Drop error:', err);
    }
  });
}
