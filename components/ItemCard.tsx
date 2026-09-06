'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  ExternalLink, 
  FileIcon, 
  Copy, 
  Clock, 
  Hourglass, 
  Download,
  CheckCheck,
  Pencil,
  Save,
  Calendar,
  X,
  GripVertical
} from 'lucide-react';
import { Item, UpdateItemInput } from '@/types/item';
import { cn, formatBytes, formatRemindTime, getRemainingTimeText } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface ItemCardProps {
  item: Item;
  index: number;
  onToggleComplete: (id: string, current: boolean) => void;
  onToggleArchive: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath?: string) => void;
  onUpdate: (id: string, updates: UpdateItemInput) => void;
  // Drag and Drop
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function ItemCard({
  item,
  index,
  onToggleComplete,
  onToggleArchive,
  onDelete,
  onUpdate,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
  isDragOver = false,
}: ItemCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(item.title || '');
  const [editContent, setEditContent] = useState(item.content || '');
  const [editRemindAt, setEditRemindAt] = useState<string | null>(item.remind_at || null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createClient();

  useEffect(() => {
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditRemindAt(item.remind_at || null);
  }, [item]);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadFile = async () => {
    if (!item.metadata?.file?.storagePath) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(item.metadata.file.storagePath, 60);

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch {
      if (item.metadata?.file?.downloadUrl) {
        window.open(item.metadata.file.downloadUrl, '_blank');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (!trimmedContent && !editTitle.trim()) {
      setIsEditing(false);
      return;
    }

    onUpdate(item.id, {
      title: editTitle.trim() || null,
      content: trimmedContent || item.content,
      remind_at: editRemindAt,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditRemindAt(item.remind_at || null);
    setIsEditing(false);
  };

  const remainingTime = item.expires_at ? getRemainingTimeText(item.expires_at) : null;
  const isExpired = remainingTime?.isExpired || false;

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={cn(
        'group relative bg-white dark:bg-surface-900 rounded-xl p-4 transition-all duration-200',
        'border border-black/[0.05] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.12]',
        'shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-subtle',
        item.is_completed && 'opacity-60 bg-gray-50/70 dark:bg-surface-950/40',
        isExpired && 'opacity-50',
        isDragging && 'opacity-30 scale-[0.98] border-dashed border-gray-400 dark:border-gray-500',
        isDragOver && 'ring-2 ring-blue-500/80 bg-blue-50/30 dark:bg-blue-950/20'
      )}
    >
      {/* Quick Actions (Hover) */}
      {!isEditing && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 bg-white/90 dark:bg-surface-900/90 backdrop-blur-sm p-1 rounded-lg border border-black/[0.05] dark:border-white/[0.05]">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="수정"
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Copy Button */}
          <button
            type="button"
            onClick={() => handleCopy(item.content || item.title || '')}
            title="내용 복사"
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {/* Archive Toggle Button */}
          <button
            type="button"
            onClick={() => onToggleArchive(item.id, item.is_archived)}
            title={item.is_archived ? '보관 해제' : '보관함으로 이동'}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition"
          >
            {item.is_archived ? (
              <ArchiveRestore className="w-3.5 h-3.5" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
          </button>
          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(item.id, item.metadata?.file?.storagePath)}
            title="삭제"
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex items-start gap-3">
        {/* Left Drag Handle (visible on hover) */}
        {!isEditing && (
          <div
            title="드래그하여 순서 변경"
            className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* TODO Checkbox */}
        {item.type === 'todo' && !isEditing ? (
          <button
            type="button"
            onClick={() => onToggleComplete(item.id, item.is_completed)}
            className={cn(
              'mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center',
              item.is_completed
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
            )}
          >
            {item.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        ) : null}

        {/* Content or Edit Form */}
        <div className="flex-1 min-w-0 pr-12">
          {isEditing ? (
            /* Inline Edit Form */
            <div className="space-y-2 py-0.5">
              {item.type !== 'todo' && (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목 (선택사항)"
                  className="w-full text-sm font-semibold bg-gray-50 dark:bg-surface-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              <textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                rows={item.type === 'todo' ? 1 : 3}
                placeholder={item.type === 'todo' ? '할 일 내용' : '메모 내용...'}
                className="w-full text-sm bg-gray-50 dark:bg-surface-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
              />

              {/* Date/Time Picker & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Remind Date Picker */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <input
                    type="datetime-local"
                    value={
                      editRemindAt
                        ? new Date(new Date(editRemindAt).getTime() - new Date().getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditRemindAt(new Date(e.target.value).toISOString());
                      } else {
                        setEditRemindAt(null);
                      }
                    }}
                    className="text-xs bg-gray-100 dark:bg-surface-800 px-2 py-1 rounded-md border border-gray-200 dark:border-surface-700 text-gray-700 dark:text-gray-300 focus:outline-none"
                  />
                  {editRemindAt && (
                    <button
                      type="button"
                      onClick={() => setEditRemindAt(null)}
                      title="알림 해제"
                      className="p-1 hover:text-red-500 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1 rounded-md text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800 transition"
                  >
                    취소 (Esc)
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3 py-1 rounded-md text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>저장</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Read-Only View */
            <>
              {/* 1. TODO CARD */}
              {item.type === 'todo' && (
                <p
                  className={cn(
                    'text-sm leading-relaxed text-gray-900 dark:text-gray-100 transition-all select-text',
                    item.is_completed && 'line-through text-gray-400 dark:text-gray-500'
                  )}
                >
                  {item.title || item.content}
                </p>
              )}

              {/* 2. LINK CARD */}
              {item.type === 'link' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {item.metadata?.og?.favicon && (
                      <img
                        src={item.metadata.og.favicon}
                        alt=""
                        className="w-3.5 h-3.5 rounded-sm object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="font-medium truncate max-w-[200px]">
                      {item.metadata?.og?.siteName || (item.content ? new URL(item.content).hostname : '')}
                    </span>
                    <a
                      href={item.content || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-emerald-600 transition inline-flex items-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <a
                    href={item.content || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group/link"
                  >
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover/link:text-emerald-600 dark:group-hover/link:text-emerald-400 transition line-clamp-1">
                      {item.title || item.metadata?.og?.title || item.content}
                    </h4>
                    {item.metadata?.og?.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.metadata.og.description}
                      </p>
                    )}
                  </a>

                  {item.metadata?.og?.image && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-black/[0.04] dark:border-white/[0.06] bg-gray-100 dark:bg-surface-800 max-h-48">
                      <img
                        src={item.metadata.og.image}
                        alt="Preview"
                        className="w-full h-auto object-cover max-h-48"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. FILE CARD */}
              {item.type === 'file' && (
                <div className="flex items-center justify-between gap-3 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg shrink-0">
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title || item.metadata?.file?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.metadata?.file?.size ? formatBytes(item.metadata.file.size) : '파일'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    disabled={downloading || isExpired}
                    className="px-3 py-1.5 bg-white dark:bg-surface-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-amber-50 rounded-lg border border-black/[0.06] shadow-sm transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloading ? '준비중...' : '다운로드'}</span>
                  </button>
                </div>
              )}

              {/* 4. PLAIN TEXT CARD */}
              {item.type === 'text' && (
                <div className="space-y-1">
                  {item.title && item.title !== item.content && (
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.title}
                    </h4>
                  )}
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap select-text">
                    {item.content}
                  </p>
                </div>
              )}

              {/* Bottom Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded font-medium',
                    item.type === 'todo' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
                    item.type === 'link' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
                    item.type === 'file' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
                    item.type === 'text' && 'bg-gray-100 text-gray-600 dark:bg-surface-800 dark:text-gray-400'
                  )}
                >
                  {item.type.toUpperCase()}
                </span>

                {item.remind_at && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{formatRemindTime(item.remind_at)}</span>
                  </span>
                )}

                {remainingTime && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium',
                      isExpired
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    )}
                  >
                    <Hourglass className="w-3 h-3" />
                    <span>{remainingTime.text}</span>
                  </span>
                )}

                <span className="text-gray-400 dark:text-gray-500 ml-auto font-mono text-[10px]">
                  {new Date(item.created_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
