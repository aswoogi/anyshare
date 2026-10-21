'use client';

import { useEffect } from 'react';

interface UseGlobalPasteProps {
  onPasteText: (text: string) => void;
  onPasteFile?: (file: File) => void;
  onPasteFiles?: (files: File[]) => void;
}

export function useGlobalPaste({ onPasteText, onPasteFile, onPasteFiles }: UseGlobalPasteProps) {
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
        const files = Array.from(e.clipboardData.files);
        if (onPasteFiles) {
          onPasteFiles(files);
        } else if (onPasteFile) {
          onPasteFile(files[0]);
        }
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
  }, [onPasteText, onPasteFile, onPasteFiles]);
}
