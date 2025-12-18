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
  width: 350,
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
    width: 350,
    height: 400,
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

  // Build a master item map from all sources
  // Items in syncData.items have the container items with proper ordering (childrenIds)
  // Items in sidebar.containers[x].items have the actual bookmark/folder data
  // Multiple versions of items may exist - always keep the newest based on lastChangeDate
  const masterItemMap = new Map();
  const itemChangeDates = new Map(); // Track lastChangeDate for each item

  // Helper to add item only if it's newer than existing
  const addItemIfNewer = (id, item, lastChangeDate) => {
    const existingDate = itemChangeDates.get(id) || 0;
    if (lastChangeDate > existingDate) {
      masterItemMap.set(id, item);
      itemChangeDates.set(id, lastChangeDate);
    }
  };

  // First, add items from firebaseSyncState.syncData.items (has container items with ordering)
  // These items have a "value" wrapper and lastChangeDate
  if (data.firebaseSyncState?.syncData?.items) {
    for (const entry of data.firebaseSyncState.syncData.items) {
      if (typeof entry === 'object' && entry !== null && entry.value && entry.value.id) {
        const lastChangeDate = entry.lastChangeDate || 0;
        addItemIfNewer(entry.value.id, entry.value, lastChangeDate);
      }
    }
  }

  // Also check sidebar.items (another source with "value" wrapper and lastChangeDate)
  if (sidebar.items) {
    for (const entry of sidebar.items) {
      if (typeof entry === 'object' && entry !== null && entry.value && entry.value.id) {
        const lastChangeDate = entry.lastChangeDate || 0;
        addItemIfNewer(entry.value.id, entry.value, lastChangeDate);
      }
    }
  }

  // Find containers - look for ones with items
  for (const container of sidebar.containers) {
    if (!container.spaces || !container.items) continue;

    // Add items from this container (these don't have "value" wrapper)
    // These represent the current state so use a high lastChangeDate
    for (const entry of container.items) {
      if (typeof entry === 'object' && entry !== null && entry.id) {
        // sidebar.containers items don't have lastChangeDate, treat as current
        addItemIfNewer(entry.id, entry, Number.MAX_SAFE_INTEGER);
      }
    }

    // Process each space in this container
    // Arc's spaces array alternates between ID strings and space objects
    for (let i = 0; i < container.spaces.length; i++) {
      const spaceEntry = container.spaces[i];

      // Skip string IDs, only process objects with space data
      if (typeof spaceEntry === 'string') continue;

      const spaceTitle = spaceEntry.title || `Space ${i + 1}`;

      // Get the container IDs for this space (pinned and unpinned)
      // Arc uses newContainerIDs which also alternates between type objects and IDs
      let containerIds = spaceEntry.containerIDs || [];

      // Also check newContainerIDs format
      if (spaceEntry.newContainerIDs) {
        for (const entry of spaceEntry.newContainerIDs) {
          if (typeof entry === 'string') {
            containerIds.push(entry);
          }
        }
      }

      // Build items tree for this space using the master item map
      const spaceItems = buildArcItemTree(masterItemMap, containerIds);

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
 * Build a tree structure from Arc's item map
 */
function buildArcItemTree(itemMap, containerIds) {
  // Find root items by looking at container items' childrenIds for proper ordering
  // Containers themselves are stored as items with data.itemContainer
  const result = [];
  const processedIds = new Set();

  // First, try to find container items and use their childrenIds for ordering
  for (const containerId of containerIds) {
    const containerItem = itemMap.get(containerId);
    if (containerItem && containerItem.childrenIds && containerItem.childrenIds.length > 0) {
      // Use the container's childrenIds for proper ordering
      for (const childId of containerItem.childrenIds) {
        if (!processedIds.has(childId)) {
          const childItem = itemMap.get(childId);
          if (childItem) {
            const node = buildArcNode(childItem, itemMap);
            if (node) {
              result.push(node);
              processedIds.add(childId);
            }
          }
        }
      }
    }
  }

  // Fallback: if no items found via containers, collect items by parentID
  if (result.length === 0) {
    for (const [id, item] of itemMap) {
      if (containerIds.includes(item.parentID) && !processedIds.has(id)) {
        const node = buildArcNode(item, itemMap);
        if (node) {
          result.push(node);
          processedIds.add(id);
        }
      }
    }
  }

  return result;
}

/**
 * Build a single node from an Arc item
 */
function buildArcNode(item, itemMap) {
  // Check if it's a bookmark (has tab data with URL)
  if (item.data?.tab?.savedURL) {
    return {
      id: generateId(),
      type: 'bookmark',
      // Prefer custom title (item.title) over page title (savedTitle)
      name: item.title || item.data.tab.savedTitle || 'Untitled',
      url: item.data.tab.savedURL,
    };
  }

  // Check if it's a folder (has title or childrenIds, no tab data)
  if ((item.title || item.childrenIds?.length) && !item.data?.tab) {
    // Use childrenIds array for proper ordering
    const children = [];
    if (item.childrenIds && item.childrenIds.length > 0) {
      for (const childId of item.childrenIds) {
        const childItem = itemMap.get(childId);
        if (childItem) {
          const childNode = buildArcNode(childItem, itemMap);
          if (childNode) {
            children.push(childNode);
          }
        }
      }
    }

    return {
      id: generateId(),
      type: 'folder',
      name: item.title || 'Folder',
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
    const x = startX + (index % 3) * 370;
    const y = startY + Math.floor(index / 3) * 420;

    return {
      id: generateId(),
      title: space.title,
      x,
      y,
      width: 350,
      height: 400,
      color: COLORS[index % COLORS.length],
      collapsed: false,
      items: space.items,
    };
  });
}
