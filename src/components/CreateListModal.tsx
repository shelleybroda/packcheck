import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, FolderPlus } from 'lucide-react';
import { ListPresetType } from '../types';

interface CreateListModalProps {
  isOpen: boolean;
  initialName?: string;
  isEditing?: boolean;
  onSave: (name: string, presetType: ListPresetType, initialItems: string[]) => void;
  onClose: () => void;
}

export const CreateListModal: React.FC<CreateListModalProps> = ({
  isOpen,
  initialName = '',
  isEditing = false,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [presetType, setPresetType] = useState<ListPresetType>('custom');
  const [itemsText, setItemsText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a name for this routine.');
      return;
    }

    const itemLines = itemsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onSave(trimmedName, presetType, itemLines);
    setName('');
    setItemsText('');
    setError('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Rename routine' : 'Create new packing routine'}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#163323]/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#163323]/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-[#163323]" />
            <h2 className="text-base font-semibold text-[#163323]">
              {isEditing ? 'Rename Routine' : 'Create New Routine'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[#57685D] hover:text-[#163323] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label htmlFor="routine-name" className="block text-xs font-semibold text-[#163323] uppercase tracking-wider mb-1.5">
              Routine Name
            </label>
            <input
              id="routine-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Day Trip, Study Session, Lab Day"
              maxLength={40}
              autoFocus
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#163323]/20 text-sm text-[#163323] placeholder:text-[#57685D]/50 focus:outline-none focus:ring-2 focus:ring-[#163323] bg-[#FAF8F5]"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {!isEditing && (
            <div>
              <label htmlFor="routine-items" className="block text-xs font-semibold text-[#163323] uppercase tracking-wider mb-1">
                Items to Pack <span className="text-[#57685D] font-normal">(one item per line)</span>
              </label>
              <textarea
                id="routine-items"
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                placeholder={"laptop\ncharger\nnotebook\nwater bottle\nstudent ID"}
                rows={4}
                className="w-full p-3 rounded-xl border border-[#163323]/20 text-sm text-[#163323] placeholder:text-[#57685D]/50 focus:outline-none focus:ring-2 focus:ring-[#163323] bg-[#FAF8F5]"
              />
              <p className="text-[11px] text-[#57685D] mt-1">
                You can always add, edit, or remove items later.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#163323]/15 text-xs font-medium text-[#57685D] hover:bg-[#FAF8F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#163323] text-white text-xs font-semibold hover:bg-[#204530] active:scale-[0.98] transition-transform"
            >
              {isEditing ? 'Save Name' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
