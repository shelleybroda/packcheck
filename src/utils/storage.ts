import { ChecklistItem, PackingList, StorageStateV1 } from '../types';

export const STORAGE_KEY = 'packcheck_storage_v1';

export const STARTER_LISTS: PackingList[] = [
  {
    id: 'routine-school',
    name: 'School',
    presetType: 'school',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    sessionVersion: 1,
    items: [
      { id: 'sch-1', label: 'notebook', packed: false, createdAt: 1700000000001 },
      { id: 'sch-2', label: 'laptop', packed: false, createdAt: 1700000000002 },
      { id: 'sch-3', label: 'charger', packed: false, createdAt: 1700000000003 },
      { id: 'sch-4', label: 'headphones', packed: false, createdAt: 1700000000004 },
      { id: 'sch-5', label: 'water bottle', packed: false, createdAt: 1700000000005 },
      { id: 'sch-6', label: 'keys', packed: false, createdAt: 1700000000006 },
    ],
  },
  {
    id: 'routine-gym',
    name: 'Gym',
    presetType: 'gym',
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
    sessionVersion: 1,
    items: [
      { id: 'gym-1', label: 'water bottle', packed: false, createdAt: 1700000001001 },
      { id: 'gym-2', label: 'towel', packed: false, createdAt: 1700000001002 },
      { id: 'gym-3', label: 'sneakers', packed: false, createdAt: 1700000001003 },
      { id: 'gym-4', label: 'headphones', packed: false, createdAt: 1700000001004 },
    ],
  },
  {
    id: 'routine-weekend',
    name: 'Weekend',
    presetType: 'weekend',
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
    sessionVersion: 1,
    items: [
      { id: 'wkd-1', label: 'shirt', packed: false, createdAt: 1700000002001 },
      { id: 'wkd-2', label: 'pants', packed: false, createdAt: 1700000002002 },
      { id: 'wkd-3', label: 'toothbrush', packed: false, createdAt: 1700000002003 },
      { id: 'wkd-4', label: 'charger', packed: false, createdAt: 1700000002004 },
    ],
  },
];

let memoryStorageFallback: StorageStateV1 | null = null;
let isStorageAvailableCache: boolean | null = null;

export function checkStorageAvailable(): boolean {
  if (isStorageAvailableCache !== null) return isStorageAvailableCache;
  try {
    const testKey = '__packcheck_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isStorageAvailableCache = true;
  } catch {
    isStorageAvailableCache = false;
  }
  return isStorageAvailableCache;
}

export function loadStoredData(): StorageStateV1 {
  const isAvailable = checkStorageAvailable();
  if (!isAvailable) {
    if (!memoryStorageFallback) {
      memoryStorageFallback = {
        version: 1,
        lists: JSON.parse(JSON.stringify(STARTER_LISTS)),
        activeListId: null,
      };
    }
    return memoryStorageFallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: StorageStateV1 = {
        version: 1,
        lists: JSON.parse(JSON.stringify(STARTER_LISTS)),
        activeListId: null,
      };
      saveStoredData(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.lists)) {
      console.warn('[PackCheck] Stored data invalid or deprecated. Reinitializing default lists.');
      const initial: StorageStateV1 = {
        version: 1,
        lists: JSON.parse(JSON.stringify(STARTER_LISTS)),
        activeListId: null,
      };
      saveStoredData(initial);
      return initial;
    }

    // Sanitize lists and items
    const cleanedLists: PackingList[] = parsed.lists.map((l: any, idx: number) => {
      const validItems: ChecklistItem[] = Array.isArray(l.items)
        ? l.items.map((it: any, itIdx: number) => ({
            id: typeof it.id === 'string' ? it.id : `item-${Date.now()}-${itIdx}`,
            label: typeof it.label === 'string' ? it.label.trim() : 'Unnamed item',
            packed: Boolean(it.packed),
            createdAt: typeof it.createdAt === 'number' ? it.createdAt : Date.now(),
          }))
        : [];

      return {
        id: typeof l.id === 'string' ? l.id : `list-${Date.now()}-${idx}`,
        name: typeof l.name === 'string' && l.name.trim() ? l.name.trim() : `Routine ${idx + 1}`,
        presetType: (['school', 'gym', 'weekend', 'custom'].includes(l.presetType)
          ? l.presetType
          : 'custom') as PackingList['presetType'],
        items: validItems,
        createdAt: typeof l.createdAt === 'number' ? l.createdAt : Date.now(),
        updatedAt: typeof l.updatedAt === 'number' ? l.updatedAt : Date.now(),
        sessionVersion: typeof l.sessionVersion === 'number' ? l.sessionVersion : 1,
      };
    });

    return {
      version: 1,
      lists: cleanedLists.length > 0 ? cleanedLists : JSON.parse(JSON.stringify(STARTER_LISTS)),
      activeListId: typeof parsed.activeListId === 'string' ? parsed.activeListId : null,
    };
  } catch (err) {
    console.error('[PackCheck] Failed to load from localStorage:', err);
    return {
      version: 1,
      lists: JSON.parse(JSON.stringify(STARTER_LISTS)),
      activeListId: null,
    };
  }
}

export function saveStoredData(data: StorageStateV1): boolean {
  if (!checkStorageAvailable()) {
    memoryStorageFallback = data;
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('[PackCheck] localStorage write failed (quota exceeded or disabled):', err);
    memoryStorageFallback = data;
    return false;
  }
}
