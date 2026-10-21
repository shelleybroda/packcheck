import React, { useState } from 'react';
import {
  Plus,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Trash2,
  Edit2,
  Package,
  Sparkles,
} from 'lucide-react';
import { PackingList } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface HomeViewProps {
  lists: PackingList[];
  isStorageOffline: boolean;
  onSelectList: (listId: string) => void;
  onCreateListClick: () => void;
  onDeleteList: (listId: string) => void;
  onRenameListClick: (list: PackingList) => void;
}

// Friendly simple backpack SVG icon matching our aesthetic
export const BackpackIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5" />
    <path d="M8 10h8" />
  </svg>
);

export const HomeView: React.FC<HomeViewProps> = ({
  lists,
  isStorageOffline,
  onSelectList,
  onCreateListClick,
  onDeleteList,
  onRenameListClick,
}) => {
  const [listToDelete, setListToDelete] = useState<PackingList | null>(null);

  const getPresetBadge = (preset: PackingList['presetType']) => {
    switch (preset) {
      case 'school':
        return 'Campus & Study';
      case 'gym':
        return 'Fitness & Sport';
      case 'weekend':
        return 'Travel & Getaway';
      default:
        return 'Personal Routine';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between">
      {/* Top Brand Header */}
      <header className="px-5 py-4 border-b border-[#163323]/8 bg-white pt-safe sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#163323] text-white flex items-center justify-center shadow-xs">
              <BackpackIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-[#163323]">PackCheck</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCreateListClick}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#163323] text-white text-xs font-semibold hover:bg-[#204530] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New routine</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto px-5 py-6 space-y-6 flex-1">
        {/* Offline / Storage Notice */}
        {isStorageOffline && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Private browsing active: routine changes will remain in memory for this session.
            </span>
          </div>
        )}

        {/* Hero Section */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#163323] tracking-tight leading-tight">
            Ready when you are.
          </h1>
          <p className="text-sm text-[#57685D] mt-2 max-w-lg leading-relaxed">
            Choose a routine, lay out your items, and verify with a quick camera scan before you head out the door.
          </p>
        </div>

        {/* Saved Routines Section */}
        <section aria-label="Saved packing routines">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-[#163323] uppercase tracking-wider">
              Saved Routines ({lists.length})
            </h2>
            <span className="text-xs text-[#57685D]">Independent packing progress</span>
          </div>

          <div className="space-y-3.5">
            {lists.map((list) => {
              const total = list.items.length;
              const packed = list.items.filter((it) => it.packed).length;
              const percent = total > 0 ? Math.round((packed / total) * 100) : 0;
              const isAllPacked = total > 0 && packed === total;

              return (
                <div
                  key={list.id}
                  className="bg-white rounded-3xl p-5 border border-[#163323]/8 hover:border-[#163323]/25 shadow-xs transition-all"
                >
                  {/* Top Row: Meta and Actions */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[11px] font-semibold text-[#57685D] tracking-wide">
                      {getPresetBadge(list.presetType)}
                    </span>

                    <div className="flex items-center gap-1 -mr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameListClick(list);
                        }}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57685D]/60 hover:text-[#163323] transition-colors"
                        aria-label={`Rename ${list.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setListToDelete(list);
                        }}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#57685D]/60 hover:text-red-600 transition-colors"
                        aria-label={`Delete ${list.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Routine Title & Item Count */}
                  <div
                    onClick={() => onSelectList(list.id)}
                    className="cursor-pointer group select-none"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#163323] group-hover:text-[#204530] transition-colors">
                        {list.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#163323]">
                        <span>{packed} / {total} packed</span>
                        <ArrowRight className="w-4 h-4 text-[#D96B27] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Items preview */}
                    <p className="text-xs text-[#57685D] mt-1.5 capitalize line-clamp-1">
                      {list.items.map((it) => it.label).join(' · ') || 'No items added yet'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-3.5 w-full h-2 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#163323]/6">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAllPacked ? 'bg-[#163323]' : 'bg-[#D96B27]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works Card */}
        <section className="bg-[#EBF3EE] rounded-3xl p-5 border border-[#163323]/10">
          <h3 className="text-xs font-bold text-[#163323] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D96B27]" />
            How Visual Packing Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#2A4836] leading-relaxed">
            <div className="p-3 bg-white/70 rounded-2xl">
              <span className="font-bold text-[#163323] block mb-0.5">1. Lay out items</span>
              Spread your gear on a bed, desk, or floor under normal room light.
            </div>
            <div className="p-3 bg-white/70 rounded-2xl">
              <span className="font-bold text-[#163323] block mb-0.5">2. Snap one photo</span>
              Gemini vision inspects the layout and matches what is visible against your checklist.
            </div>
            <div className="p-3 bg-white/70 rounded-2xl">
              <span className="font-bold text-[#163323] block mb-0.5">3. Review & pack</span>
              Confirm what is actually packed. Items not seen stay remaining.
            </div>
          </div>
        </section>
      </main>

      {/* Footer Info & Disclaimers */}
      <footer className="px-5 py-4 border-t border-[#163323]/8 bg-white/60 pb-safe">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-[#57685D]">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#163323]" />
            <span>Lists saved on this device</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#163323]" />
            <span>Photos sent to Google Gemini for analysis. PackCheck does not save photos.</span>
          </div>
        </div>
      </footer>

      {/* Delete Routine Modal */}
      <ConfirmModal
        isOpen={Boolean(listToDelete)}
        title={`Delete "${listToDelete?.name}"?`}
        message="Are you sure you want to delete this routine? All items and progress for this list will be removed from your device."
        confirmLabel="Delete Routine"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          if (listToDelete) {
            onDeleteList(listToDelete.id);
            setListToDelete(null);
          }
        }}
        onCancel={() => setListToDelete(null)}
      />
    </div>
  );
};
