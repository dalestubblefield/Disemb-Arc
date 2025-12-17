// Utility functions

/**
 * Generate a unique ID
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Debounce a function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Available colors for box accents
 */
export const COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

/**
 * Default box dimensions
 */
export const DEFAULT_BOX = {
  width: 280,
  height: 350,
  color: COLORS[0],
};

/**
 * Create a new empty box
 */
export function createEmptyBox(x = 100, y = 100) {
  return {
    id: generateId(),
    title: 'New Box',
    x,
    y,
    width: DEFAULT_BOX.width,
    height: DEFAULT_BOX.height,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    collapsed: false,
    items: [],
  };
}

/**
 * Create a new folder item
 */
export function createFolder(name = 'New Folder') {
  return {
    id: generateId(),
    type: 'folder',
    name,
    expanded: true,
    children: [],
  };
}

/**
 * Create a new bookmark item
 */
export function createBookmark(name = 'New Bookmark', url = 'https://') {
  return {
    id: generateId(),
    type: 'bookmark',
    name,
    url,
  };
}

/**
 * Find an item by ID in a tree structure
 */
export function findItemById(items, id) {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find parent of an item by ID
 */
export function findParentById(items, id, parent = null) {
  for (const item of items) {
    if (item.id === id) return parent;
    if (item.children) {
      const found = findParentById(item.children, id, item);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Remove an item by ID from a tree structure
 */
export function removeItemById(items, id) {
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items.splice(index, 1);
    return true;
  }
  for (const item of items) {
    if (item.children && removeItemById(item.children, id)) {
      return true;
    }
  }
  return false;
}

/**
 * Insert an item at a specific position
 */
export function insertItemAt(items, item, index) {
  items.splice(index, 0, item);
}

/**
 * Parse Netscape bookmark HTML format
 * Returns an array of items (folders and bookmarks)
 */
export function parseBookmarksHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find the root DL element
  const rootDl = doc.querySelector('DL');
  if (!rootDl) return [];

  return parseDlElement(rootDl);
}

/**
 * Parse a DL element and its children
 */
function parseDlElement(dl) {
  const items = [];
  const children = dl.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.tagName === 'DT') {
      // Check if it's a folder (H3) or bookmark (A)
      const h3 = child.querySelector(':scope > H3');
      const a = child.querySelector(':scope > A');

      if (h3) {
        // It's a folder
        const folder = {
          id: generateId(),
          type: 'folder',
          name: h3.textContent.trim(),
          expanded: true,
          children: [],
        };

        // Look for the nested DL (sibling or child)
        let nestedDl = child.querySelector(':scope > DL');
        if (!nestedDl) {
          // Check next sibling
          const nextSibling = children[i + 1];
          if (nextSibling && nextSibling.tagName === 'DL') {
            nestedDl = nextSibling;
            i++; // Skip the DL in the main loop
          }
        }

        if (nestedDl) {
          folder.children = parseDlElement(nestedDl);
        }

        items.push(folder);
      } else if (a) {
        // It's a bookmark
        items.push({
          id: generateId(),
          type: 'bookmark',
          name: a.textContent.trim(),
          url: a.getAttribute('HREF') || '',
        });
      }
    }
  }

  return items;
}

/**
 * Create a box from imported bookmarks
 */
export function createBoxFromBookmarks(items, title = 'Imported Bookmarks', x = 100, y = 100) {
  return {
    id: generateId(),
    title,
    x,
    y,
    width: 320,
    height: 450,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    collapsed: false,
    items,
  };
}
