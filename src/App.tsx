import React, { useState, useEffect } from 'react';
import {
  loadStoredData,
  saveStoredData,
  checkStorageAvailable,
  STARTER_LISTS,
} from './utils/storage';
import { PackingList, ChecklistItem, StorageStateV1, AiScanResult } from './types';
import { HomeView } from './components/HomeView';
import { ChecklistView } from './components/ChecklistView';
import { CameraCapture } from './components/CameraCapture';
import { ScanPreviewModal } from './components/ScanPreviewModal';
import { ReviewModal } from './components/ReviewModal';
import { CreateListModal } from './components/CreateListModal';
import { ProcessedImage } from './utils/image';

export default function App() {
  const [data, setData] = useState<StorageStateV1>(() => loadStoredData());
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isStorageOffline, setIsStorageOffline] = useState<boolean>(() => !checkStorageAvailable());

  // Camera & AI Scan State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<ProcessedImage | null>(null);
  const [scanResult, setScanResult] = useState<AiScanResult | null>(null);

  // Routine Creation & Renaming Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<PackingList | null>(null);

  // Sync to localStorage on data change
  const updateData = (newData: StorageStateV1) => {
    setData(newData);
    const saved = saveStoredData(newData);
    if (!saved) {
      setIsStorageOffline(true);
    }
  };

  const activeList = activeListId ? data.lists.find((l) => l.id === activeListId) || null : null;

  // Toggle item packed status
  const handleToggleItem = (itemId: string) => {
    if (!activeListId) return;

    const updatedLists = data.lists.map((l) => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        items: l.items.map((it) => (it.id === itemId ? { ...it, packed: !it.packed } : it)),
      };
    });

    updateData({ ...data, lists: updatedLists });
  };

  // Add a new item to the active list
  const handleAddItem = (label: string) => {
    if (!activeListId) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label,
      packed: false,
      createdAt: Date.now(),
    };

    const updatedLists = data.lists.map((l) => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        items: [...l.items, newItem],
      };
    });

    updateData({ ...data, lists: updatedLists });
  };

  // Edit item label
  const handleEditItem = (itemId: string, newLabel: string) => {
    if (!activeListId) return;

    const updatedLists = data.lists.map((l) => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        items: l.items.map((it) => (it.id === itemId ? { ...it, label: newLabel } : it)),
      };
    });

    updateData({ ...data, lists: updatedLists });
  };

  // Delete an item from the active list
  const handleDeleteItem = (itemId: string) => {
    if (!activeListId) return;

    const updatedLists = data.lists.map((l) => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        items: l.items.filter((it) => it.id !== itemId),
      };
    });

    updateData({ ...data, lists: updatedLists });
  };

  // Start new pack: uncheck all items for this list only, preserving items and incrementing sessionVersion
  const handleResetProgress = () => {
    if (!activeListId) return;

    const updatedLists = data.lists.map((l) => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        sessionVersion: (l.sessionVersion || 1) + 1,
        items: l.items.map((it) => ({ ...it, packed: false })),
      };
    });

    updateData({ ...data, lists: updatedLists });
    // Clear any in-flight scan result
    setScanResult(null);
    setCapturedImage(null);
  };

  // Create a new named routine
  const handleSaveRoutine = (name: string, presetType: PackingList['presetType'], initialItemLabels: string[]) => {
    if (editingList) {
      // Renaming existing routine
      const updatedLists = data.lists.map((l) =>
        l.id === editingList.id ? { ...l, name, updatedAt: Date.now() } : l
      );
      updateData({ ...data, lists: updatedLists });
      setEditingList(null);
      setIsCreateModalOpen(false);
      return;
    }

    // Creating new routine
    const newItems: ChecklistItem[] = initialItemLabels.map((lbl, idx) => ({
      id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      label: lbl,
      packed: false,
      createdAt: Date.now() + idx,
    }));

    const newList: PackingList = {
      id: `routine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      presetType,
      items: newItems,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionVersion: 1,
    };

    updateData({
      ...data,
      lists: [...data.lists, newList],
    });
    setIsCreateModalOpen(false);
    setActiveListId(newList.id);
  };

  // Delete an entire routine
  const handleDeleteList = (listId: string) => {
    const updatedLists = data.lists.filter((l) => l.id !== listId);
    updateData({
      ...data,
      lists: updatedLists.length > 0 ? updatedLists : JSON.parse(JSON.stringify(STARTER_LISTS)),
      activeListId: activeListId === listId ? null : activeListId,
    });
    if (activeListId === listId) {
      setActiveListId(null);
    }
  };

  // Camera & AI Handlers
  const handleOpenScan = () => {
    if (!activeList) return;
    setIsCameraOpen(true);
  };

  const handlePhotoSelected = (processed: ProcessedImage) => {
    setIsCameraOpen(false);
    setCapturedImage(processed);
  };

  const handleAnalysisSuccess = (result: AiScanResult) => {
    setCapturedImage(null);
    setScanResult(result);
  };

  // User confirmed items in review screen
  const handleConfirmPacked = (itemIdsToPack: string[]) => {
    if (!activeListId || itemIdsToPack.length === 0) {
      setScanResult(null);
      return;
    }

    const idSet = new Set(itemIdsToPack);
    const updatedLists = data.lists.map((l) => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        updatedAt: Date.now(),
        items: l.items.map((it) => (idSet.has(it.id) ? { ...it, packed: true } : it)),
      };
    });

    updateData({ ...data, lists: updatedLists });
    setScanResult(null);
  };

  const handleScanMore = () => {
    setScanResult(null);
    setCapturedImage(null);
    setIsCameraOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#163323] selection:bg-[#D96B27]/20 font-sans">
      {activeList ? (
        <ChecklistView
          list={activeList}
          onBack={() => setActiveListId(null)}
          onToggleItem={handleToggleItem}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onResetProgress={handleResetProgress}
          onDeleteList={() => handleDeleteList(activeList.id)}
          onRenameList={() => {
            setEditingList(activeList);
            setIsCreateModalOpen(true);
          }}
          onOpenScan={handleOpenScan}
        />
      ) : (
        <HomeView
          lists={data.lists}
          isStorageOffline={isStorageOffline}
          onSelectList={(id) => setActiveListId(id)}
          onCreateListClick={() => {
            setEditingList(null);
            setIsCreateModalOpen(true);
          }}
          onDeleteList={handleDeleteList}
          onRenameListClick={(list) => {
            setEditingList(list);
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* Camera Capture Modal */}
      {isCameraOpen && activeList && (
        <CameraCapture
          listName={activeList.name}
          remainingCount={activeList.items.filter((it) => !it.packed).length}
          onPhotoSelected={handlePhotoSelected}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Scan Preview & Gemini Confirmation Modal */}
      {capturedImage && activeList && (
        <ScanPreviewModal
          image={capturedImage}
          listId={activeList.id}
          listName={activeList.name}
          sessionVersion={activeList.sessionVersion || 1}
          uncheckedItems={activeList.items.filter((it) => !it.packed)}
          onAnalysisSuccess={handleAnalysisSuccess}
          onRetake={() => {
            setCapturedImage(null);
            setIsCameraOpen(true);
          }}
          onClose={() => setCapturedImage(null)}
        />
      )}

      {/* Review Screen */}
      {scanResult && activeList && (
        <ReviewModal
          scanResult={scanResult}
          currentList={activeList}
          onConfirmPacked={handleConfirmPacked}
          onScanMore={handleScanMore}
          onClose={() => setScanResult(null)}
        />
      )}

      {/* Create / Edit Routine Modal */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        initialName={editingList?.name || ''}
        isEditing={Boolean(editingList)}
        onSave={handleSaveRoutine}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingList(null);
        }}
      />
    </div>
  );
}
