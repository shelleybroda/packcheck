import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Edit2,
  MoreVertical,
  CheckCircle2,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { ChecklistItem, PackingList } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface ChecklistViewProps {
  list: PackingList;
  onBack: () => void;
  onToggleItem: (itemId: string) => void;
  onAddItem: (label: string) => void;
  onEditItem: (itemId: string, newLabel: string) => void;
  onDeleteItem: (itemId: string) => void;
  onResetProgress: () => void;
  onDeleteList: () => void;
  onRenameList: () => void;
  onOpenScan: () => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  list,
  onBack,
  onToggleItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onResetProgress,
  onDeleteList,
  onRenameList,
  onOpenScan,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const totalItems = list.items.length;
  const packedItems = list.items.filter((it) => it.packed);
  const remainingItems = list.items.filter((it) => !it.packed);
  const packedCount = packedItems.length;
  const progressPercent = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    onAddItem(trimmed);
    setNewItemText('');
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingLabel(item.label);
  };

  const handleSaveEdit = (itemId: string) => {
    const trimmed = editingLabel.trim();
    if (trimmed) {
      onEditItem(itemId, trimmed);
    }
    setEditingItemId(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between pb-28">
      {/* Top App Bar (Pattern 2 from Mobile Touch Reference) */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#163323]/8 px-4 py-2.5 pt-safe flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#163323] hover:text-[#204530] transition-colors active:scale-95"
          aria-label="Back to routines"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center px-2 min-w-0">
          <h1 className="text-base font-bold text-[#163323] truncate">{list.name}</h1>
          <p className="text-[11px] font-medium text-[#57685D] truncate">
            {packedCount} of {totalItems} packed · {progressPercent}%
          </p>
        </div>

        {/* Menu Actions */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[#57685D] hover:text-[#163323] rounded-full transition-colors"
            aria-label="List options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-[#163323]/10 py-1.5 z-40">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsResetConfirmOpen(true);
                }}
                className="w-full min-h-[40px] px-4 py-2 text-left text-xs text-[#163323] font-medium hover:bg-[#FAF8F5] flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-[#57685D]" />
                Start new pack
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onRenameList();
                }}
                className="w-full min-h-[40px] px-4 py-2 text-left text-xs text-[#163323] font-medium hover:bg-[#FAF8F5] flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4 text-[#57685D]" />
                Rename routine
              </button>
              <div className="my-1 border-t border-[#163323]/8" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
                className="w-full min-h-[40px] px-4 py-2 text-left text-xs text-red-600 font-medium hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                Delete routine
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl w-full mx-auto px-4 py-4 space-y-5">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#163323]/8 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-semibold text-[#57685D] uppercase tracking-wider">Pack Progress</span>
              <p className="text-xl font-bold text-[#163323]">
                {packedCount} <span className="text-sm font-normal text-[#57685D]">/ {totalItems} items packed</span>
              </p>
            </div>
            {totalItems > 0 && packedCount === totalItems ? (
              <span className="text-xs font-semibold text-[#163323] px-2.5 py-1 rounded-full bg-[#EBF3EE]">
                All Packed!
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#D96B27] px-2.5 py-1 rounded-full bg-[#FFF4ED]">
                {remainingItems.length} remaining
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#163323]/8">
            <div
              className="h-full bg-[#163323] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#163323]/6">
            <p className="text-[11px] text-[#57685D]">
              {packedCount === totalItems && totalItems > 0
                ? 'Everything on your list is packed. Have a great trip!'
                : 'Check items manually or use camera scan to verify.'}
            </p>
            {packedCount > 0 && (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="text-[11px] font-semibold text-[#57685D] hover:text-[#163323] transition-colors min-h-[36px] px-2 py-1 flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start new pack
              </button>
            )}
          </div>
        </div>

        {/* Add Item Input Form */}
        <form onSubmit={handleAddItemSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add an item (e.g. water bottle, keys)"
            maxLength={60}
            className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#163323]/15 text-sm text-[#163323] placeholder:text-[#57685D]/50 focus:outline-none focus:ring-2 focus:ring-[#163323] bg-white shadow-xs"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-[#163323] text-white text-xs font-semibold hover:bg-[#204530] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 shrink-0"
            aria-label="Add item"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* Empty State */}
        {totalItems === 0 && (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-[#163323]/8">
            <PackageCheck className="w-12 h-12 text-[#57685D]/50 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#163323] mb-1">Your checklist is empty</h3>
            <p className="text-xs text-[#57685D] leading-relaxed max-w-xs mx-auto mb-4">
              Add the items you need to remember for this routine, or scan a laid-out pile to build it.
            </p>
          </div>
        )}

        {/* Remaining Items Group */}
        {remainingItems.length > 0 && (
          <section aria-label="Remaining items">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-bold text-[#163323] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D96B27]" />
                Remaining Items ({remainingItems.length})
              </h2>
              <span className="text-[11px] text-[#57685D]">Tap to mark packed</span>
            </div>

            <div className="space-y-2">
              {remainingItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-[#163323]/10 hover:border-[#163323]/25 transition-all flex items-center justify-between px-3.5 py-1.5 shadow-xs"
                >
                  {/* Left Touch Container: Checkbox and Label */}
                  <div
                    onClick={() => onToggleItem(item.id)}
                    className="flex-1 flex items-center gap-3 min-h-[48px] cursor-pointer select-none py-1"
                  >
                    <div className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={item.packed}
                        onChange={() => {}}
                        className="w-5 h-5 rounded cursor-pointer pointer-events-none"
                        aria-label={`Mark ${item.label} as packed`}
                      />
                    </div>

                    {editingItemId === item.id ? (
                      <input
                        type="text"
                        value={editingLabel}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={() => handleSaveEdit(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        autoFocus
                        className="text-sm font-medium text-[#163323] px-2 py-1 rounded border border-[#163323]/30 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-medium text-[#163323] capitalize break-words">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57685D]/70 hover:text-[#163323] transition-colors"
                      aria-label={`Edit ${item.label}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57685D]/70 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${item.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Packed Items Group */}
        {packedItems.length > 0 && (
          <section aria-label="Packed items" className="pt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-semibold text-[#57685D] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#163323]" />
                Packed ({packedItems.length})
              </h2>
              <span className="text-[11px] text-[#57685D]">Tap to unpack</span>
            </div>

            <div className="space-y-1.5">
              {packedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAF8F5] rounded-xl border border-[#163323]/6 flex items-center justify-between px-3.5 py-1 transition-all"
                >
                  <div
                    onClick={() => onToggleItem(item.id)}
                    className="flex-1 flex items-center gap-3 min-h-[44px] cursor-pointer select-none py-1"
                  >
                    <div className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={item.packed}
                        onChange={() => {}}
                        className="w-5 h-5 rounded cursor-pointer pointer-events-none accent-[#163323]"
                        aria-label={`Unpack ${item.label}`}
                      />
                    </div>
                    <span className="text-sm text-[#57685D] line-through capitalize break-words">
                      {item.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57685D]/50 hover:text-red-600 transition-colors"
                    aria-label={`Delete ${item.label}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating / Sticky Bottom Scan Items Action (Thumb Zone Ergonomics) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/95 to-transparent backdrop-blur-xs pb-safe z-20">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenScan}
            className="flex-1 min-h-[52px] rounded-2xl bg-[#163323] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#163323]/15 hover:bg-[#204530] active:scale-[0.98] transition-all"
          >
            <Camera className="w-5 h-5 text-[#D96B27]" />
            <span>
              {remainingItems.length > 0
                ? `Scan items (${remainingItems.length} remaining)`
                : 'Scan to verify layout'}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Start new pack?"
        message={`This will uncheck all ${packedCount} packed items on your "${list.name}" list so you can pack fresh. Your items will NOT be deleted.`}
        confirmLabel="Reset Packed Status"
        cancelLabel="Keep Current Progress"
        onConfirm={() => {
          setIsResetConfirmOpen(false);
          onResetProgress();
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title={`Delete "${list.name}"?`}
        message="Are you sure you want to delete this routine? This action cannot be undone."
        confirmLabel="Delete Routine"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDeleteList();
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
};
