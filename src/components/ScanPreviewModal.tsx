import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { ChecklistItem, AiScanResult } from '../types';
import { ProcessedImage } from '../utils/image';

interface ScanPreviewModalProps {
  image: ProcessedImage;
  listId: string;
  listName: string;
  sessionVersion: number;
  uncheckedItems: ChecklistItem[];
  onAnalysisSuccess: (result: AiScanResult) => void;
  onRetake: () => void;
  onClose: () => void;
}

export const ScanPreviewModal: React.FC<ScanPreviewModalProps> = ({
  image,
  listId,
  listName,
  sessionVersion,
  uncheckedItems,
  onAnalysisSuccess,
  onRetake,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendToGemini = async () => {
    if (isLoading) return; // Prevent duplicate submissions

    setIsLoading(true);
    setErrorMessage(null);

    // Abort controller for 55-second client timeout (allows receiving server's 45s response)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const payload = {
        imageBase64: image.base64,
        mimeType: image.mimeType,
        items: uncheckedItems.map((it) => ({
          id: it.id,
          label: it.label,
        })),
      };

      const response = await fetch('/api/match-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      // Valid response received from Gemini
      const scanResult: AiScanResult = {
        listId,
        sessionVersion,
        message: data.message || 'Analysis complete.',
        matches: Array.isArray(data.matches) ? data.matches : [],
        timestamp: Date.now(),
      };

      onAnalysisSuccess(scanResult);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[PackCheck] Scan API error:', err);

      if (err.name === 'AbortError') {
        setErrorMessage('The scan request timed out. Please check your internet connection and try again.');
      } else if (!navigator.onLine) {
        setErrorMessage('You appear to be offline. Please reconnect to the internet and retry.');
      } else {
        setErrorMessage(
          err.message || 'Could not complete visual matching. Please try again with better lighting.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm photo scan"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
    >
      <div className="w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl border border-[#163323]/10 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#163323]/8 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={onRetake}
              disabled={isLoading}
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#57685D] hover:text-[#163323] transition-colors disabled:opacity-40"
              aria-label="Back to camera"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-[#163323]">Ready to Scan</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[#57685D] hover:text-[#163323] rounded-full transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Photo Preview Container */}
          <div className="relative rounded-2xl overflow-hidden bg-black/5 border border-[#163323]/10 aspect-4/3 flex items-center justify-center">
            <img
              src={image.dataUrl}
              alt="Laid out items preview"
              className="w-full h-full object-cover"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white px-4 text-center">
                <RefreshCw className="w-8 h-8 text-[#D96B27] animate-spin" />
                <p className="font-semibold text-base">Gemini is analyzing your layout...</p>
                <p className="text-xs text-white/80 max-w-xs">
                  Checking photo against {uncheckedItems.length} remaining items on your {listName} checklist.
                </p>
              </div>
            )}
          </div>

          {/* Privacy & Photo notice */}
          <div className="rounded-xl p-3.5 bg-[#EBF3EE] border border-[#163323]/10 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#163323] shrink-0 mt-0.5" />
            <div className="text-xs text-[#2A4836] leading-relaxed">
              <span className="font-semibold">Photo Use Notice:</span> Photos sent to Google Gemini for analysis. PackCheck does not save photos.
            </div>
          </div>

          {/* Unchecked items preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#57685D] uppercase tracking-wider">
                Searching for {uncheckedItems.length} items
              </span>
              <span className="text-xs text-[#57685D]">{listName}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-white border border-[#163323]/8">
              {uncheckedItems.map((item) => (
                <span
                  key={item.id}
                  className="text-xs text-[#163323] font-medium px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#163323]/8"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Scan failed</p>
                <p className="leading-relaxed mb-2">{errorMessage}</p>
                <p className="text-[11px] text-red-700">
                  You can retry the scan or manually check off items on your list anytime.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-[#163323]/8 pb-safe space-y-2">
          <button
            type="button"
            onClick={handleSendToGemini}
            disabled={isLoading}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#163323] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#204530] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing items...
              </>
            ) : errorMessage ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry Visual Scan
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D96B27]" />
                Spot Items with Gemini
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRetake}
            disabled={isLoading}
            className="w-full min-h-[44px] px-4 py-2 text-xs font-medium text-[#57685D] hover:text-[#163323] transition-colors"
          >
            Retake or choose different photo
          </button>
        </div>
      </div>
    </div>
  );
};
