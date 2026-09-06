'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Clock, 
  Hourglass, 
  Paperclip, 
  Send, 
  CheckSquare, 
  Loader2, 
  Sparkles,
  Calendar,
  X 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ItemType, OgMetadata } from '@/types/item';
import { formatRemindTime } from '@/lib/utils';

interface QuickInputBarProps {
  onAddItem: (itemData: {
    type: ItemType;
    title?: string | null;
    content: string;
    metadata?: any;
    remind_at?: string | null;
    expires_at?: string | null;
  }) => Promise<any>;
  externalContent?: { text?: string; file?: File } | null;
  onClearExternalContent?: () => void;
  isLoggedIn?: boolean;
  onRequireAuth?: () => void;
}

export function QuickInputBar({
  onAddItem,
  externalContent,
  onClearExternalContent,
  isLoggedIn = true,
  onRequireAuth,
}: QuickInputBarProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Quick Chips active states
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isTodoMode, setIsTodoMode] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Handle external paste from global listener
  useEffect(() => {
    if (externalContent?.file) {
      handleFileSelected(externalContent.file);
      onClearExternalContent?.();
    } else if (externalContent?.text) {
      handleAutoSubmit(externalContent.text);
      onClearExternalContent?.();
    }
  }, [externalContent]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Determine type dynamically based on input content
  const detectType = (text: string, hasFile: boolean): ItemType => {
    if (hasFile) return 'file';
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return 'link';
    if (/^\[\s*\]\s+/i.test(trimmed) || /^-\s+/i.test(trimmed) || isTodoMode) return 'todo';
    return 'text';
  };

  const detectedType = detectType(content, !!attachedFile);

  const handleFileSelected = (file: File) => {
    setAttachedFile(file);
    if (!content.trim()) {
      setContent(file.name);
    }
  };

  const handleChipTodo = () => {
    if (content.startsWith('[ ] ')) {
      setContent(content.replace(/^\[ \]\s*/, ''));
      setIsTodoMode(false);
    } else {
      setContent(`[ ] ${content.replace(/^- \s*/, '')}`);
      setIsTodoMode(true);
    }
    textareaRef.current?.focus();
  };

  const handleChipRemindTonight = () => {
    if (remindAt && remindAt.includes('20:00')) {
      setRemindAt(null);
    } else {
      const tonight = new Date();
      tonight.setHours(20, 0, 0, 0);
      if (tonight.getTime() <= Date.now()) {
        tonight.setDate(tonight.getDate() + 1);
      }
      setRemindAt(tonight.toISOString());
    }
  };

  const handleChipRemindTomorrowMorning = () => {
    if (remindAt && remindAt.includes('09:00')) {
      setRemindAt(null);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setRemindAt(tomorrow.toISOString());
    }
  };

  const handleChipExpire24h = () => {
    if (expiresAt) {
      setExpiresAt(null);
    } else {
      const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setExpiresAt(expireTime.toISOString());
    }
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File): Promise<{ path: string; publicUrl?: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from('files').getPublicUrl(filePath);
    return { path: filePath, publicUrl: publicData?.publicUrl };
  };

  // Fetch OG Metadata for links
  const fetchOgMetadata = async (url: string): Promise<OgMetadata | null> => {
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to parse OG metadata:', e);
    }
    return null;
  };

  // Execute Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isLoggedIn) {
      onRequireAuth?.();
      return;
    }

    if ((!content.trim() && !attachedFile) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const rawText = content.trim();
      const currentType = detectType(rawText, !!attachedFile);

      if (currentType === 'file' && attachedFile) {
        // Handle File upload
        const uploadResult = await uploadFile(attachedFile);
        await onAddItem({
          type: 'file',
          title: attachedFile.name,
          content: uploadResult.path,
          metadata: {
            file: {
              name: attachedFile.name,
              size: attachedFile.size,
              mimeType: attachedFile.type,
              storagePath: uploadResult.path,
              downloadUrl: uploadResult.publicUrl,
            },
          },
          remind_at: remindAt,
          expires_at: expiresAt,
        });
      } else if (currentType === 'link') {
        // Handle Link & OG parse
        const og = await fetchOgMetadata(rawText);
        await onAddItem({
          type: 'link',
          title: og?.title || rawText,
          content: rawText,
          metadata: { og: og || undefined },
          remind_at: remindAt,
          expires_at: expiresAt,
        });
      } else if (currentType === 'todo') {
        // Handle Todo
        const cleanTitle = rawText.replace(/^\[\s*\]\s*/, '').replace(/^-\s*/, '');
        await onAddItem({
          type: 'todo',
          title: cleanTitle,
          content: rawText,
          remind_at: remindAt,
          expires_at: expiresAt,
        });
      } else {
        // Handle Plain Text
        const firstLine = rawText.split('\n')[0].substring(0, 50);
        await onAddItem({
          type: 'text',
          title: firstLine,
          content: rawText,
          remind_at: remindAt,
          expires_at: expiresAt,
        });
      }

      // Reset state
      setContent('');
      setAttachedFile(null);
      setRemindAt(null);
      setExpiresAt(null);
      setIsTodoMode(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Immediate auto submission helper for external paste
  const handleAutoSubmit = async (text: string) => {
    setContent(text);
    // Focus textarea to allow quick review or instant enter
    textareaRef.current?.focus();
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoggedIn) {
      onRequireAuth?.();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl transition-all duration-200 ${
        isDragging
          ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
          : 'bg-white dark:bg-surface-900 border border-black/[0.08] dark:border-white/[0.08] shadow-subtle hover:shadow-floating'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <form onSubmit={handleSubmit} className="p-3.5 sm:p-4">
        {/* Attached file preview chip */}
        {attachedFile && (
          <div className="mb-2.5 flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <span className="truncate max-w-[85%] font-medium">
              📎 {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-0.5 hover:bg-amber-200/50 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Textarea */}
        <div className="flex items-start gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onClick={() => {
              if (!isLoggedIn) onRequireAuth?.();
            }}
            onFocus={() => {
              if (!isLoggedIn) onRequireAuth?.();
            }}
            onChange={(e) => {
              if (!isLoggedIn) {
                onRequireAuth?.();
                return;
              }
              setContent(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              isLoggedIn
                ? '기억할 모든 것... 링크, [ ] 할 일, 메모, 파일 드롭 (Ctrl+V 지원)'
                : '로그인 후 나만의 메모, 할 일, 링크를 안전하게 기록해 보세요 (클릭 시 로그인)'
            }
            className="w-full resize-none bg-transparent text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none leading-relaxed py-1"
          />

          {/* Quick Submit & File Attach button */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  onRequireAuth?.();
                  return;
                }
                fileInputRef.current?.click();
              }}
              title="파일 첨부"
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-lg transition"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={(!content.trim() && !attachedFile) || isSubmitting}
              className={`p-1.5 rounded-lg transition ${
                content.trim() || attachedFile
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Type Badge & Quick Chips Bar */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-surface-800 flex flex-wrap items-center justify-between gap-1.5 text-xs select-none">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Quick Chip 1: Todo */}
            <button
              type="button"
              onClick={handleChipTodo}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                detectedType === 'todo'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-surface-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>할 일</span>
            </button>

            {/* Quick Chip 2: Remind Tonight */}
            <button
              type="button"
              onClick={handleChipRemindTonight}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                remindAt && remindAt.includes('20:00')
                  ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-surface-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>오늘 저녁</span>
            </button>

            {/* Quick Chip 3: Remind Tomorrow Morning */}
            <button
              type="button"
              onClick={handleChipRemindTomorrowMorning}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                remindAt && remindAt.includes('09:00')
                  ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-surface-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>내일 오전</span>
            </button>

            {/* Quick Chip 3.5: Custom Date & Time Picker */}
            <div className="relative inline-flex items-center">
              <input
                type="datetime-local"
                ref={dateInputRef}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.value) {
                    setRemindAt(new Date(e.target.value).toISOString());
                  }
                }}
              />
              {remindAt && !remindAt.includes('20:00') && !remindAt.includes('09:00') ? (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatRemindTime(remindAt)}</span>
                  <button
                    type="button"
                    onClick={() => setRemindAt(null)}
                    className="hover:text-purple-800 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-surface-800 transition font-medium"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>날짜/시간 직접 지정</span>
                </button>
              )}
            </div>

            {/* Quick Chip 4: 24h Expiration (File priority) */}
            <button
              type="button"
              onClick={handleChipExpire24h}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                expiresAt
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-surface-800'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>24시간 만료</span>
            </button>
          </div>

          {/* Auto Detection indicator */}
          {(content.trim() || attachedFile) && (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 pr-1 font-mono">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>
                {detectedType === 'link' && '링크 감지됨'}
                {detectedType === 'todo' && '할 일 감지됨'}
                {detectedType === 'file' && '파일 모드'}
                {detectedType === 'text' && '텍스트 메모'}
              </span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
