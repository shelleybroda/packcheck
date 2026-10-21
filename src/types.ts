export interface ChecklistItem {
  id: string;
  label: string;
  packed: boolean;
  createdAt: number;
}

export type ListPresetType = 'school' | 'gym' | 'weekend' | 'custom';

export interface PackingList {
  id: string;
  name: string;
  presetType: ListPresetType;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
  sessionVersion: number; // Incremented on "Start new pack" to prevent stale AI scan results
}

export interface StorageStateV1 {
  version: 1;
  lists: PackingList[];
  activeListId: string | null;
}

export interface AiMatchItem {
  itemId: string;
  observedObject: string;
  briefEvidence: string;
  confidence: 'clear' | 'uncertain';
}

export interface AiScanResult {
  listId: string;
  sessionVersion: number;
  message: string;
  matches: AiMatchItem[];
  timestamp: number;
}
