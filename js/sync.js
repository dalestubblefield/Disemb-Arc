// Chrome Bookmarks Sync Module
// Provides two-way sync between app spaces and Chrome's bookmarks bar

// Chrome Bookmarks Bar ID
const BOOKMARKS_BAR_ID = '1';

// Flag to prevent sync loops
let isSyncing = false;

// Callbacks for updating app state
let onChromeBookmarkChanged = null;

/**
 * Initialize sync module with callback for Chrome changes
 */
export function initSync(changeCallback) {
  onChromeBookmarkChanged = changeCallback;
  setupChromeListeners();
}

/**
 * Sync all spaces to Chrome bookmarks bar
 * Creates folders for each space and syncs their contents
 */
export async function syncAllSpacesToChrome(boxes) {
  if (!chrome?.bookmarks) {
    console.warn('Chrome bookmarks API not available');
    return boxes;
  }

  isSyncing = true;
  try {
    const updatedBoxes = [];
    for (const box of boxes) {
      const updatedBox = await syncSpaceToChrome(box);
      updatedBoxes.push(updatedBox);
    }
    return updatedBoxes;
  } finally {
    isSyncing = false;
  }
}

/**
 * Sync a single space (box) to Chrome bookmarks
 */
export async function syncSpaceToChrome(box) {
  if (!chrome?.bookmarks) return box;

  isSyncing = true;
  try {
    let chromeId = box.chromeId;

    // Check if the Chrome folder still exists
    if (chromeId) {
      try {
        await chrome.bookmarks.get(chromeId);
      } catch {
        // Folder was deleted in Chrome, recreate it
        chromeId = null;
      }
    }

    // Create or update the space folder
    if (!chromeId) {
      const folder = await chrome.bookmarks.create({
        parentId: BOOKMARKS_BAR_ID,
        title: box.title,
      });
      chromeId = folder.id;
    } else {
      await chrome.bookmarks.update(chromeId, { title: box.title });
    }

    // Sync all items in the space
    const updatedItems = await syncItemsToChrome(box.items, chromeId);

    return {
      ...box,
      chromeId,
      items: updatedItems,
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Sync items (folders and bookmarks) to Chrome
 */
async function syncItemsToChrome(items, parentChromeId) {
  const updatedItems = [];

  for (const item of items) {
    let chromeId = item.chromeId;

    // Check if the Chrome bookmark still exists
    if (chromeId) {
      try {
        await chrome.bookmarks.get(chromeId);
      } catch {
        chromeId = null;
      }
    }

    if (item.type === 'folder') {
      // Create or update folder
      if (!chromeId) {
        const folder = await chrome.bookmarks.create({
          parentId: parentChromeId,
          title: item.name,
        });
        chromeId = folder.id;
      } else {
        await chrome.bookmarks.update(chromeId, { title: item.name });
      }

      // Recursively sync children
      const updatedChildren = item.children
        ? await syncItemsToChrome(item.children, chromeId)
        : [];

      updatedItems.push({
        ...item,
        chromeId,
        children: updatedChildren,
      });
    } else {
      // Create or update bookmark
      if (!chromeId) {
        const bookmark = await chrome.bookmarks.create({
          parentId: parentChromeId,
          title: item.name,
          url: item.url,
        });
        chromeId = bookmark.id;
      } else {
        await chrome.bookmarks.update(chromeId, {
          title: item.name,
          url: item.url,
        });
      }

      updatedItems.push({
        ...item,
        chromeId,
      });
    }
  }

  return updatedItems;
}

/**
 * Remove a space folder from Chrome
 */
export async function removeSpaceFromChrome(box) {
  if (!chrome?.bookmarks || !box.chromeId) return;

  isSyncing = true;
  try {
    await chrome.bookmarks.removeTree(box.chromeId);
  } catch (err) {
    console.warn('Failed to remove Chrome bookmark folder:', err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Remove an item from Chrome
 */
export async function removeItemFromChrome(item) {
  if (!chrome?.bookmarks || !item.chromeId) return;

  isSyncing = true;
  try {
    if (item.type === 'folder') {
      await chrome.bookmarks.removeTree(item.chromeId);
    } else {
      await chrome.bookmarks.remove(item.chromeId);
    }
  } catch (err) {
    console.warn('Failed to remove Chrome bookmark:', err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Setup Chrome bookmark event listeners for two-way sync
 */
function setupChromeListeners() {
  if (!chrome?.bookmarks) return;

  // Bookmark created in Chrome
  chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    if (isSyncing) return;
    if (onChromeBookmarkChanged) {
      onChromeBookmarkChanged('created', { id, bookmark });
    }
  });

  // Bookmark removed in Chrome
  chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    if (isSyncing) return;
    if (onChromeBookmarkChanged) {
      onChromeBookmarkChanged('removed', { id, removeInfo });
    }
  });

  // Bookmark changed in Chrome (title or URL)
  chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    if (isSyncing) return;
    if (onChromeBookmarkChanged) {
      onChromeBookmarkChanged('changed', { id, changeInfo });
    }
  });

  // Bookmark moved in Chrome
  chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
    if (isSyncing) return;
    if (onChromeBookmarkChanged) {
      onChromeBookmarkChanged('moved', { id, moveInfo });
    }
  });
}

/**
 * Find an item by its Chrome ID in the boxes structure
 */
export function findItemByChromeId(boxes, chromeId) {
  for (const box of boxes) {
    if (box.chromeId === chromeId) {
      return { type: 'space', item: box, parent: null };
    }
    const found = findInItems(box.items, chromeId, box);
    if (found) return found;
  }
  return null;
}

function findInItems(items, chromeId, parent) {
  for (const item of items) {
    if (item.chromeId === chromeId) {
      return { type: item.type, item, parent };
    }
    if (item.children) {
      const found = findInItems(item.children, chromeId, item);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the parent space (box) for a Chrome bookmark ID
 */
export function findParentSpace(boxes, chromeId) {
  for (const box of boxes) {
    if (box.chromeId === chromeId) return box;
    if (hasDescendantWithChromeId(box.items, chromeId)) return box;
  }
  return null;
}

function hasDescendantWithChromeId(items, chromeId) {
  for (const item of items) {
    if (item.chromeId === chromeId) return true;
    if (item.children && hasDescendantWithChromeId(item.children, chromeId)) {
      return true;
    }
  }
  return false;
}

/**
 * Remove an item by Chrome ID from the items array
 */
export function removeItemByChromeId(items, chromeId) {
  const index = items.findIndex((item) => item.chromeId === chromeId);
  if (index !== -1) {
    items.splice(index, 1);
    return true;
  }
  for (const item of items) {
    if (item.children && removeItemByChromeId(item.children, chromeId)) {
      return true;
    }
  }
  return false;
}
