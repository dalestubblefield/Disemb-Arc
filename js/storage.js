// Storage abstraction for chrome.storage.local

const STORAGE_KEY = 'arcLikeNewTab';

/**
 * Default data structure
 */
const DEFAULT_DATA = {
  boxes: [],
  expandedSpaceId: null,
  settings: {
    theme: 'system',
  },
};

/**
 * Migrate data to remove deprecated position/size properties
 */
function migrateData(data) {
  if (!data.boxes) return { data, needsSave: false };

  let needsSave = false;

  // Remove x, y, width, height from boxes (no longer used in accordion layout)
  data.boxes = data.boxes.map((box) => {
    if ('x' in box || 'y' in box || 'width' in box || 'height' in box) {
      needsSave = true;
      const { x, y, width, height, ...rest } = box;
      return rest;
    }
    return box;
  });

  // Also remove collapsed property (accordion uses expandedSpaceId instead)
  data.boxes = data.boxes.map((box) => {
    if ('collapsed' in box) {
      needsSave = true;
      const { collapsed, ...rest } = box;
      return rest;
    }
    return box;
  });

  return { data, needsSave };
}

/**
 * Load data from storage
 */
export async function loadData() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(STORAGE_KEY, async (result) => {
        let data = result[STORAGE_KEY] || DEFAULT_DATA;
        const { data: migratedData, needsSave } = migrateData(data);
        if (needsSave) {
          await saveData(migratedData);
        }
        resolve(migratedData);
      });
    } else {
      // Fallback to localStorage for development
      const stored = localStorage.getItem(STORAGE_KEY);
      let data = stored ? JSON.parse(stored) : DEFAULT_DATA;
      const { data: migratedData, needsSave } = migrateData(data);
      if (needsSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
      }
      resolve(migratedData);
    }
  });
}

/**
 * Save data to storage
 */
export async function saveData(data) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
    } else {
      // Fallback to localStorage for development
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      resolve();
    }
  });
}

/**
 * Save boxes to storage (convenience function)
 */
export async function saveBoxes(boxes) {
  const data = await loadData();
  data.boxes = boxes;
  await saveData(data);
}

/**
 * Save boxes and expanded space ID together
 */
export async function saveState(boxes, expandedSpaceId) {
  const data = await loadData();
  data.boxes = boxes;
  data.expandedSpaceId = expandedSpaceId;
  await saveData(data);
}

/**
 * Save just the expanded space ID
 */
export async function saveExpandedSpaceId(expandedSpaceId) {
  const data = await loadData();
  data.expandedSpaceId = expandedSpaceId;
  await saveData(data);
}

/**
 * Save settings to storage (convenience function)
 */
export async function saveSettings(settings) {
  const data = await loadData();
  data.settings = { ...data.settings, ...settings };
  await saveData(data);
}
