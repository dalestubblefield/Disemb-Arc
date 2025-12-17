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

/**
 * Parse Arc Browser's StorableSidebar.json format
 * Returns an array of spaces, each with { title, items }
 */
export function parseArcJson(jsonString) {
  const data = JSON.parse(jsonString);
  const spaces = [];

  // Find the sidebar containers
  const sidebar = data.sidebar;
  if (!sidebar || !sidebar.containers) {
    return [];
  }

  // Find containers - look for ones with items
  for (const container of sidebar.containers) {
    if (!container.spaces || !container.items) continue;

    // Process each space in this container
    for (let i = 0; i < container.spaces.length; i++) {
      const spaceData = container.spaces[i];
      const spaceTitle = spaceData.title || `Space ${i + 1}`;

      // Get the container IDs for this space (pinned and unpinned)
      const containerIds = spaceData.containerIDs || [];

      // Build items tree for this space
      const spaceItems = buildArcItemTree(container.items, containerIds);

      if (spaceItems.length > 0) {
        spaces.push({
          title: spaceTitle,
          items: spaceItems,
        });
      }
    }
  }

  return spaces;
}

/**
 * Build a tree structure from Arc's flat items array
 */
function buildArcItemTree(items, containerIds) {
  // Filter items that belong to this space's containers
  const relevantItems = items.filter(item => {
    return containerIds.includes(item.parentID) ||
           items.some(other => containerIds.includes(other.parentID) && isDescendant(items, item.id, other.id));
  });

  // Also include items whose parent is in the relevant set
  const relevantIds = new Set(relevantItems.map(i => i.id));
  const allRelevant = items.filter(item => {
    return containerIds.includes(item.parentID) || relevantIds.has(item.parentID) || isAncestorRelevant(items, item, containerIds, relevantIds);
  });

  // Build the tree starting from container roots
  const result = [];

  for (const item of allRelevant) {
    if (containerIds.includes(item.parentID)) {
      const node = buildArcNode(item, allRelevant);
      if (node) {
        result.push(node);
      }
    }
  }

  return result;
}

/**
 * Check if item is a descendant of potential ancestor
 */
function isDescendant(items, itemId, ancestorId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return false;
  if (item.parentID === ancestorId) return true;
  if (!item.parentID) return false;
  return isDescendant(items, item.parentID, ancestorId);
}

/**
 * Check if any ancestor is relevant
 */
function isAncestorRelevant(items, item, containerIds, relevantIds) {
  if (!item.parentID) return false;
  if (containerIds.includes(item.parentID)) return true;
  if (relevantIds.has(item.parentID)) return true;
  const parent = items.find(i => i.id === item.parentID);
  if (!parent) return false;
  return isAncestorRelevant(items, parent, containerIds, relevantIds);
}

/**
 * Build a single node from an Arc item
 */
function buildArcNode(item, allItems) {
  // Check if it's a bookmark (has tab data with URL)
  if (item.data?.tab?.savedURL) {
    return {
      id: generateId(),
      type: 'bookmark',
      name: item.data.tab.savedTitle || item.title || 'Untitled',
      url: item.data.tab.savedURL,
    };
  }

  // Check if it's a folder (has title, no tab data)
  if (item.title && !item.data?.tab) {
    const children = allItems
      .filter(child => child.parentID === item.id)
      .map(child => buildArcNode(child, allItems))
      .filter(Boolean);

    return {
      id: generateId(),
      type: 'folder',
      name: item.title,
      expanded: true,
      children,
    };
  }

  return null;
}

/**
 * Create boxes from Arc spaces
 */
export function createBoxesFromArcSpaces(spaces, startX = 50, startY = 50) {
  return spaces.map((space, index) => {
    const x = startX + (index % 3) * 340;
    const y = startY + Math.floor(index / 3) * 400;

    return {
      id: generateId(),
      title: space.title,
      x,
      y,
      width: 320,
      height: 450,
      color: COLORS[index % COLORS.length],
      collapsed: false,
      items: space.items,
    };
  });
}
