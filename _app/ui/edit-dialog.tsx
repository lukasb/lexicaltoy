import { useEffect, useRef, useState } from "react";

export const EditDialog = ({ isOpen, onClose, onSubmit, initialValue, title }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newValue: string) => void;
  initialValue: string;
  title: string;
}) => {
  const [newValue, setNewValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset newValue to initialValue and focus the input when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setNewValue(initialValue);
      // Use setTimeout to ensure the input is focused after the dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (newValue.trim() !== '') {
      onSubmit(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newValue.trim() !== '') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl mb-4 dark:text-white">{title}</h2>
        <input
          ref={inputRef}
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
          data-testid="edit-dialog-input"
        />
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={newValue.trim() === ''}
            className="px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="edit-dialog-submit"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};