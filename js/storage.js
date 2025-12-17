// Storage abstraction for chrome.storage.local

const STORAGE_KEY = 'arcLikeNewTab';

/**
 * Default data structure
 */
const DEFAULT_DATA = {
  boxes: [],
  settings: {
    theme: 'system',
  },
};

/**
 * Load data from storage
 */
export async function loadData() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        resolve(result[STORAGE_KEY] || DEFAULT_DATA);
      });
    } else {
      // Fallback to localStorage for development
      const data = localStorage.getItem(STORAGE_KEY);
      resolve(data ? JSON.parse(data) : DEFAULT_DATA);
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
 * Save settings to storage (convenience function)
 */
export async function saveSettings(settings) {
  const data = await loadData();
  data.settings = { ...data.settings, ...settings };
  await saveData(data);
}
