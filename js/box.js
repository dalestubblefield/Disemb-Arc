// Box component - handles rendering, dragging, and resizing of boxes

import { COLORS, clamp, debounce } from './utils.js';
import { renderTree } from './tree.js';

/**
 * Render a box element
 */
export function renderBox(box, handlers) {
  const el = document.createElement('div');
  el.className = 'box' + (box.collapsed ? ' collapsed' : '');
  el.dataset.id = box.id;
  el.style.left = `${box.x}px`;
  el.style.top = `${box.y}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
  el.style.setProperty('--box-accent', box.color);

  // Header
  const header = document.createElement('div');
  header.className = 'box-header';

  // Collapse button
  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'box-collapse-btn';
  collapseBtn.innerHTML = box.collapsed ? '&#9654;' : '&#9660;';
  collapseBtn.title = box.collapsed ? 'Expand' : 'Collapse';
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onToggleCollapse(box.id);
  });

  // Title input
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'box-title';
  titleInput.value = box.title;
  titleInput.addEventListener('change', () => {
    handlers.onTitleChange(box.id, titleInput.value);
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') titleInput.blur();
  });
  titleInput.addEventListener('mousedown', (e) => e.stopPropagation());

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

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'box-delete-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.title = 'Delete box';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Delete this box?')) {
      handlers.onDelete(box.id);
    }
  });

  header.appendChild(collapseBtn);
  header.appendChild(titleInput);
  header.appendChild(colorBtn);
  header.appendChild(deleteBtn);

  // Content area with tree
  const content = document.createElement('div');
  content.className = 'box-content';

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

  // Resize handles
  const resizeE = document.createElement('div');
  resizeE.className = 'resize-handle resize-handle-e';

  const resizeS = document.createElement('div');
  resizeS.className = 'resize-handle resize-handle-s';

  const resizeSE = document.createElement('div');
  resizeSE.className = 'resize-handle resize-handle-se';

  el.appendChild(header);
  el.appendChild(content);
  el.appendChild(resizeE);
  el.appendChild(resizeS);
  el.appendChild(resizeSE);

  // Setup drag behavior for header
  setupBoxDrag(el, header, handlers);

  // Setup resize behavior
  setupBoxResize(el, resizeE, 'e', handlers);
  setupBoxResize(el, resizeS, 's', handlers);
  setupBoxResize(el, resizeSE, 'se', handlers);

  return el;
}

/**
 * Setup box dragging
 */
function setupBoxDrag(boxEl, handleEl, handlers) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  const onMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = boxEl.offsetLeft;
    startTop = boxEl.offsetTop;

    boxEl.classList.add('dragging');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newX = clamp(startLeft + dx, 0, window.innerWidth - boxEl.offsetWidth);
    const newY = clamp(startTop + dy, 0, window.innerHeight - boxEl.offsetHeight);

    boxEl.style.left = `${newX}px`;
    boxEl.style.top = `${newY}px`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;

    boxEl.classList.remove('dragging');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    handlers.onPositionChange(
      boxEl.dataset.id,
      parseInt(boxEl.style.left),
      parseInt(boxEl.style.top)
    );
  };

  handleEl.addEventListener('mousedown', onMouseDown);
}

/**
 * Setup box resizing
 */
function setupBoxResize(boxEl, handleEl, direction, handlers) {
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  const onMouseDown = (e) => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = boxEl.offsetWidth;
    startHeight = boxEl.offsetHeight;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (direction.includes('e')) {
      const newWidth = clamp(startWidth + dx, 200, 800);
      boxEl.style.width = `${newWidth}px`;
    }

    if (direction.includes('s')) {
      const newHeight = clamp(startHeight + dy, 100, 1000);
      boxEl.style.height = `${newHeight}px`;
    }
  };

  const onMouseUp = () => {
    if (!isResizing) return;
    isResizing = false;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    handlers.onSizeChange(
      boxEl.dataset.id,
      parseInt(boxEl.style.width),
      parseInt(boxEl.style.height)
    );
  };

  handleEl.addEventListener('mousedown', onMouseDown);
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
