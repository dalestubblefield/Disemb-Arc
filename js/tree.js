// Tree component - handles rendering and interaction of the bookmark tree

/**
 * Render the tree structure
 */
export function renderTree(items, boxId, accentColor, handlers) {
  const ul = document.createElement('ul');
  ul.className = 'tree';
  ul.dataset.boxId = boxId;

  items.forEach((item, index) => {
    const li = renderTreeItem(item, boxId, accentColor, handlers, index);
    ul.appendChild(li);
  });

  // Setup drop zone for the tree root
  setupTreeDropZone(ul, boxId, null, handlers);

  return ul;
}

/**
 * Render a single tree item (folder or bookmark)
 */
function renderTreeItem(item, boxId, accentColor, handlers, index) {
  const li = document.createElement('li');

  const row = document.createElement('div');
  row.className = 'tree-item';
  row.dataset.id = item.id;
  row.dataset.type = item.type;
  row.dataset.boxId = boxId;
  row.draggable = true;

  // Expand button (for folders)
  if (item.type === 'folder') {
    const expandBtn = document.createElement('button');
    expandBtn.className = 'tree-item-expand' + (item.expanded ? ' expanded' : '');
    expandBtn.innerHTML = '&#9654;';
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onToggleExpand(boxId, item.id);
    });
    row.appendChild(expandBtn);
  } else {
    // Spacer for alignment
    const spacer = document.createElement('span');
    spacer.className = 'tree-item-expand';
    spacer.style.visibility = 'hidden';
    row.appendChild(spacer);
  }

  // Icon
  if (item.type === 'folder') {
    const icon = document.createElement('span');
    icon.className = 'tree-item-icon folder';
    icon.innerHTML = '&#128193;';
    row.appendChild(icon);
  } else {
    // Favicon for bookmarks
    const favicon = document.createElement('img');
    favicon.className = 'tree-item-favicon';
    favicon.width = 16;
    favicon.height = 16;
    favicon.loading = 'lazy';
    try {
      const url = new URL(item.url);
      favicon.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch {
      favicon.src = 'https://www.google.com/s2/favicons?domain=example.com&sz=32';
    }
    favicon.onerror = () => {
      // Fallback to a default icon on error
      favicon.style.display = 'none';
      const fallback = document.createElement('span');
      fallback.className = 'tree-item-icon';
      fallback.innerHTML = '&#128279;';
      favicon.parentNode.insertBefore(fallback, favicon);
    };
    row.appendChild(favicon);
  }

  // Name input
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'tree-item-name';
  nameInput.value = item.name;
  nameInput.readOnly = true;
  nameInput.title = item.type === 'bookmark' ? item.url : item.name;

  // Double-click to edit
  nameInput.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    nameInput.readOnly = false;
    nameInput.select();
  });

  nameInput.addEventListener('blur', () => {
    nameInput.readOnly = true;
    if (nameInput.value !== item.name) {
      handlers.onItemNameChange(boxId, item.id, nameInput.value);
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      nameInput.blur();
    } else if (e.key === 'Escape') {
      nameInput.value = item.name;
      nameInput.blur();
    }
  });

  row.appendChild(nameInput);

  // Click to open bookmark
  if (item.type === 'bookmark') {
    row.addEventListener('click', (e) => {
      if (e.target !== nameInput || nameInput.readOnly) {
        window.open(item.url, '_blank');
      }
    });
  }

  // Click to expand/collapse folder
  if (item.type === 'folder') {
    row.addEventListener('click', (e) => {
      // Don't toggle if clicking on the name input while editing
      if (e.target === nameInput && !nameInput.readOnly) {
        return;
      }
      handlers.onToggleExpand(boxId, item.id);
    });
  }

  // Context menu for adding/deleting
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, item, boxId, handlers);
  });

  // Drag and drop
  setupTreeItemDrag(row, item, boxId, handlers);

  li.appendChild(row);

  // Children (for folders)
  if (item.type === 'folder') {
    const childrenUl = document.createElement('ul');
    childrenUl.className = 'tree-children' + (item.expanded ? '' : ' collapsed');

    if (item.children) {
      item.children.forEach((child, childIndex) => {
        const childLi = renderTreeItem(child, boxId, accentColor, handlers, childIndex);
        childrenUl.appendChild(childLi);
      });
    }

    // Setup drop zone for folder
    setupTreeDropZone(childrenUl, boxId, item.id, handlers);

    li.appendChild(childrenUl);
  }

  return li;
}

/**
 * Setup drag behavior for tree items
 */
function setupTreeItemDrag(element, item, boxId, handlers) {
  element.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      itemId: item.id,
      sourceBoxId: boxId,
    }));
    e.dataTransfer.effectAllowed = 'move';
    element.classList.add('dragging');

    // Store dragging item globally for reference
    document.body.dataset.draggingId = item.id;
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
    document.querySelectorAll('.drag-over, .drag-above, .drag-below').forEach(el => {
      el.classList.remove('drag-over', 'drag-above', 'drag-below');
    });
    delete document.body.dataset.draggingId;
  });

  // Allow dropping on all items for reordering
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Don't allow dropping on self
    if (document.body.dataset.draggingId === item.id) return;

    // Determine drop position based on mouse location
    const rect = element.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    // Clear previous indicators
    element.classList.remove('drag-over', 'drag-above', 'drag-below');

    if (item.type === 'folder') {
      // For folders: top third = above, middle third = into, bottom third = below
      const thirdHeight = rect.height / 3;
      if (e.clientY < rect.top + thirdHeight) {
        element.classList.add('drag-above');
      } else if (e.clientY > rect.bottom - thirdHeight) {
        element.classList.add('drag-below');
      } else {
        element.classList.add('drag-over');
      }
    } else {
      // For bookmarks: top half = above, bottom half = below
      if (e.clientY < midY) {
        element.classList.add('drag-above');
      } else {
        element.classList.add('drag-below');
      }
    }
  });

  element.addEventListener('dragleave', (e) => {
    // Only remove if actually leaving the element
    if (!element.contains(e.relatedTarget)) {
      element.classList.remove('drag-over', 'drag-above', 'drag-below');
    }
  });

  element.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wasAbove = element.classList.contains('drag-above');
    const wasBelow = element.classList.contains('drag-below');
    const wasInto = element.classList.contains('drag-over');

    element.classList.remove('drag-over', 'drag-above', 'drag-below');

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.itemId === item.id) return;

      if (wasInto && item.type === 'folder') {
        // Drop into folder
        handlers.onMoveItem(data.sourceBoxId, data.itemId, boxId, item.id);
      } else if (wasAbove || wasBelow) {
        // Drop before or after this item (reorder)
        handlers.onReorderItem(data.sourceBoxId, data.itemId, boxId, item.id, wasBelow ? 'after' : 'before');
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  });
}

/**
 * Setup drop zone for tree root or folder children
 */
function setupTreeDropZone(element, boxId, parentId, handlers) {
  element.addEventListener('dragover', (e) => {
    if (e.target === element) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  });

  element.addEventListener('drop', (e) => {
    if (e.target === element) {
      e.preventDefault();

      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        handlers.onMoveItem(data.sourceBoxId, data.itemId, boxId, parentId);
      } catch (err) {
        console.error('Drop error:', err);
      }
    }
  });
}

/**
 * Show context menu
 */
function showContextMenu(x, y, item, boxId, handlers) {
  // Remove any existing menu
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'color-picker'; // Reuse styling
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.gap = '2px';
  menu.style.padding = '4px';
  menu.style.minWidth = '120px';

  const createMenuItem = (text, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'tree-add-btn';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.textContent = text;
    btn.addEventListener('click', () => {
      onClick();
      menu.remove();
    });
    return btn;
  };

  // Rename option for all items
  menu.appendChild(createMenuItem('Rename', () => {
    const newName = prompt('Enter new name:', item.name);
    if (newName !== null && newName.trim() !== '') {
      handlers.onItemNameChange(boxId, item.id, newName.trim());
    }
  }));

  if (item.type === 'folder') {
    menu.appendChild(createMenuItem('Add Folder', () => {
      handlers.onAddFolder(boxId, item.id);
    }));
    menu.appendChild(createMenuItem('Add Bookmark', () => {
      handlers.onAddBookmark(boxId, item.id);
    }));
  }

  if (item.type === 'bookmark') {
    menu.appendChild(createMenuItem('Edit URL', () => {
      const newUrl = prompt('Enter URL:', item.url);
      if (newUrl !== null) {
        handlers.onItemUrlChange(boxId, item.id, newUrl);
      }
    }));
  }

  menu.appendChild(createMenuItem('Delete', () => {
    if (confirm(`Delete "${item.name}"?`)) {
      handlers.onDeleteItem(boxId, item.id);
    }
  }));

  document.body.appendChild(menu);

  // Close menu when clicking outside
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}
