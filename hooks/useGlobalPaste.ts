'use client';

import { useEffect } from 'react';

interface UseGlobalPasteProps {
  onPasteText: (text: string) => void;
  onPasteFile: (file: File) => void;
}

export function useGlobalPaste({ onPasteText, onPasteFile }: UseGlobalPasteProps) {
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // If user is already focused on an editable element (input, textarea), let default browser behavior happen
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) {
        return;
      }

      if (!e.clipboardData) return;

      // 1. Check if files (e.g. image from clipboard screenshot) exist
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const file = e.clipboardData.files[0];
        onPasteFile(file);
        return;
      }

      // 2. Check text
      const text = e.clipboardData.getData('text');
      if (text && text.trim().length > 0) {
        e.preventDefault();
        onPasteText(text.trim());
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onPasteText, onPasteFile]);
}
