import React, { useState } from 'react';
import { Check, X, Camera, AlertCircle, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { AiScanResult, ChecklistItem, PackingList } from '../types';

interface ReviewModalProps {
  scanResult: AiScanResult;
  currentList: PackingList;
  onConfirmPacked: (itemIdsToPack: string[]) => void;
  onScanMore: () => void;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  scanResult,
  currentList,
  onConfirmPacked,
  onScanMore,
  onClose,
}) => {
  // Session safety verification: ensure this scan belongs to this list and hasn't been superseded
  const isStaleSession =
    scanResult.listId !== currentList.id || scanResult.sessionVersion !== currentList.sessionVersion;

  // Track user-selected items for packing.
  // CRITICAL REQUIREMENT: All confirmation checkboxes start UNCHECKED!
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group matches
  const itemMap = new Map(currentList.items.map((it) => [it.id, it]));

  const clearMatches = scanResult.matches.filter((m) => m.confidence === 'clear' && itemMap.has(m.itemId));
  const uncertainMatches = scanResult.matches.filter((m) => m.confidence === 'uncertain' && itemMap.has(m.itemId));

  const matchedIdSet = new Set(scanResult.matches.map((m) => m.itemId));
  // Items in remaining checklist that were not matched in the photo
  const notSeenItems = currentList.items.filter((it) => !it.packed && !matchedIdSet.has(it.id));

  const toggleSelect = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllClear = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      clearMatches.forEach((m) => next.add(m.itemId));
      return next;
    });
  };

  const handleConfirm = () => {
    if (isStaleSession) {
      alert('This pack session was reset or changed while scanning. Results cannot be applied to this list.');
      onClose();
      return;
    }
    onConfirmPacked(Array.from(selectedIds));
  };

  if (isStaleSession) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Stale scan warning"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white rounded-2xl p-6 text-center border border-[#163323]/10 shadow-xl">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#163323] mb-2">Session Changed</h3>
          <p className="text-sm text-[#57685D] mb-6 leading-relaxed">
            The checklist was reset or switched while this scan was being processed. To protect your data, these
            results cannot be applied.
          </p>
          <button
            onClick={onClose}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#163323] text-white font-medium text-sm"
          >
            Return to Checklist
          </button>
        </div>
      </div>
    );
  }

  const totalMatches = clearMatches.length + uncertainMatches.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review scan matches"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
    >
      <div className="w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl border border-[#163323]/10 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#163323]/8 flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D96B27]" />
              <h2 className="text-base font-semibold text-[#163323]">Review Visual Matches</h2>
            </div>
            <p className="text-xs text-[#57685D] mt-0.5">
              Select only the items you have verified and packed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[#57685D] hover:text-[#163323] rounded-full transition-colors"
            aria-label="Skip review"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Summary Banner */}
        <div className="px-5 py-3 bg-[#EBF3EE] border-b border-[#163323]/8 text-xs text-[#2A4836] flex items-center justify-between gap-3">
          <p className="font-medium leading-relaxed">{scanResult.message}</p>
          {clearMatches.length > 0 && selectedIds.size < clearMatches.length && (
            <button
              onClick={selectAllClear}
              className="text-[11px] font-semibold text-[#163323] hover:underline shrink-0 min-h-[32px] px-2 py-1"
            >
              Select clear
            </button>
          )}
        </div>

        {/* Matches Body */}
        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {totalMatches === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-white border border-[#163323]/8">
              <HelpCircle className="w-10 h-10 text-[#57685D]/60 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#163323] mb-1">No matches found in photo</h3>
              <p className="text-xs text-[#57685D] leading-relaxed max-w-xs mx-auto mb-4">
                Items might be obscured, folded, or under dim lighting. You can retake the photo or check off items
                manually.
              </p>
              <button
                type="button"
                onClick={onScanMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#163323] text-white text-xs font-medium"
              >
                <Camera className="w-4 h-4" />
                Scan again with better light
              </button>
            </div>
          ) : (
            <>
              {/* Likely Matches (Clear) */}
              {clearMatches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-semibold text-[#163323] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#163323]" />
                      Likely Matches ({clearMatches.length})
                    </h3>
                    <span className="text-[11px] text-[#57685D]">Tap to confirm packed</span>
                  </div>

                  <div className="space-y-2">
                    {clearMatches.map((m) => {
                      const item = itemMap.get(m.itemId)!;
                      const isChecked = selectedIds.has(m.itemId);

                      return (
                        <div
                          key={m.itemId}
                          onClick={() => toggleSelect(m.itemId)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                            isChecked
                              ? 'bg-white border-[#163323] shadow-sm ring-1 ring-[#163323]'
                              : 'bg-white border-[#163323]/10 hover:border-[#163323]/25'
                          }`}
                        >
                          {/* 44px touch target container for checkbox */}
                          <div className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by row container
                              className="w-5 h-5 rounded cursor-pointer pointer-events-none"
                              aria-label={`Confirm packed: ${item.label}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#163323] capitalize">
                                {item.label}
                              </span>
                              <span className="text-[11px] font-medium text-[#163323]/80">Clear match</span>
                            </div>
                            <p className="text-xs text-[#57685D] mt-0.5 font-medium">{m.observedObject}</p>
                            <p className="text-[11px] text-[#57685D]/80 mt-0.5 italic">{m.briefEvidence}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Uncertain Suggestions */}
              {uncertainMatches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-semibold text-[#D96B27] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D96B27]" />
                      Uncertain Suggestions ({uncertainMatches.length})
                    </h3>
                    <span className="text-[11px] text-[#57685D]">Verify carefully</span>
                  </div>

                  <div className="space-y-2">
                    {uncertainMatches.map((m) => {
                      const item = itemMap.get(m.itemId)!;
                      const isChecked = selectedIds.has(m.itemId);

                      return (
                        <div
                          key={m.itemId}
                          onClick={() => toggleSelect(m.itemId)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                            isChecked
                              ? 'bg-[#FFF9F5] border-[#D96B27] shadow-sm ring-1 ring-[#D96B27]'
                              : 'bg-white border-[#D96B27]/25 hover:border-[#D96B27]/50'
                          }`}
                        >
                          <div className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-5 h-5 rounded cursor-pointer pointer-events-none accent-[#D96B27]"
                              aria-label={`Confirm packed: ${item.label}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#163323] capitalize">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-semibold text-[#D96B27] px-2 py-0.5 rounded-full bg-[#FFF4ED]">
                                Uncertain
                              </span>
                            </div>
                            <p className="text-xs text-[#57685D] mt-0.5 font-medium">{m.observedObject}</p>
                            <p className="text-[11px] text-[#D96B27]/90 mt-0.5 leading-tight">{m.briefEvidence}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Not Confirmed Yet (Remaining Items not matched) */}
          {notSeenItems.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[#57685D] uppercase tracking-wider">
                  Not confirmed yet ({notSeenItems.length})
                </h3>
                <span className="text-[11px] text-[#57685D]">Still needed</span>
              </div>
              <p className="text-[11px] text-[#57685D] mb-2 leading-relaxed">
                These items were not spotted in the photo. They remain on your checklist:
              </p>
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-white border border-[#163323]/8">
                {notSeenItems.map((item) => (
                  <span
                    key={item.id}
                    className="text-xs text-[#57685D] font-medium px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#163323]/6 capitalize"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-[#163323]/8 pb-safe space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#163323] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#204530] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            {selectedIds.size > 0
              ? `Confirm & mark ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'} as packed`
              : 'Select items to confirm packing'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onScanMore}
              className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold text-[#163323] bg-[#FAF8F5] border border-[#163323]/15 rounded-xl hover:bg-[#EBF3EE] transition-colors flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              Scan more items
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] px-3 py-2 text-xs font-medium text-[#57685D] hover:text-[#163323] transition-colors"
            >
              Skip / Keep unconfirmed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
