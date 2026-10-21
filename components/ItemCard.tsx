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
  GripVertical,
  Loader2,
  Link2,
  Share2
} from 'lucide-react';
import { Item, UpdateItemInput, FileMetadata } from '@/types/item';
import { cn, formatBytes, formatRemindTime, getRemainingTimeText } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface ItemCardProps {
  item: Item;
  index: number;
  onToggleComplete: (id: string, current: boolean) => void;
  onToggleArchive: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath?: string | string[]) => void;
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
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Extract all files (multi or single fallback)
  const filesList: FileMetadata[] = 
    item.metadata?.files && item.metadata.files.length > 0
      ? item.metadata.files
      : item.metadata?.file
        ? [item.metadata.file]
        : [];
  const allStoragePaths = filesList.map((f) => f.storagePath).filter(Boolean);

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

  const downloadTargetFile = async (targetFile: FileMetadata) => {
    if (!targetFile?.storagePath) return;
    setDownloadingPath(targetFile.storagePath);
    const originalFileName = targetFile.name || item.title || 'download';

    try {
      // 1. Request signed URL with original filename for Content-Disposition header
      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(targetFile.storagePath, 60, {
          download: originalFileName,
        });

      if (!error && data?.signedUrl) {
        // Trigger download with correct filename
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = originalFileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 2. Fallback: Direct storage download as Blob to force exact filename
      const { data: blobData, error: downloadError } = await supabase.storage
        .from('files')
        .download(targetFile.storagePath);

      if (!downloadError && blobData) {
        const blobUrl = URL.createObjectURL(blobData);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = originalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }

      // 3. Fallback to public URL
      if (targetFile.downloadUrl) {
        const link = document.createElement('a');
        link.href = targetFile.downloadUrl;
        link.download = originalFileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingPath(null);
    }
  };

  const handleDownloadAll = async () => {
    if (filesList.length === 0 || downloadingAll) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < filesList.length; i++) {
        await downloadTargetFile(filesList[i]);
        if (i < filesList.length - 1) {
          // Delay to prevent browser from blocking multiple simultaneous downloads
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (filesList.length === 0 || sharing) return;
    setSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title || (filesList[0]?.name ? `${filesList[0].name}` : '공유된 파일'),
          files: filesList.map((f) => ({
            name: f.name,
            size: f.size,
            storagePath: f.storagePath,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);

      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      console.error('Share link generation failed:', err);
      alert('공유 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const handleGenerateSingleFileShareLink = async (targetFile: FileMetadata) => {
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetFile.name,
          files: [
            {
              name: targetFile.name,
              size: targetFile.size,
              storagePath: targetFile.storagePath,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error('Failed to generate single file share link');
      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);

      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      console.error('Failed to generate single file share link:', err);
      alert('공유 링크 생성 중 오류가 발생했습니다.');
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

  // Type-based left accent border colors
  const typeAccentBorder = {
    todo: 'border-l-4 border-l-blue-500',
    link: 'border-l-4 border-l-emerald-500',
    file: 'border-l-4 border-l-amber-500',
    text: 'border-l-4 border-l-gray-400 dark:border-l-gray-500',
  }[item.type];

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={cn(
        'group relative bg-white dark:bg-surface-900 rounded-xl p-4 transition-all duration-150',
        'border border-gray-300 dark:border-surface-600',
        'hover:border-gray-400 dark:hover:border-surface-500',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md',
        typeAccentBorder,
        item.is_completed && 'opacity-60 bg-gray-50/90 dark:bg-surface-950/50 border-l-gray-300 dark:border-l-gray-700',
        isExpired && 'opacity-50',
        isDragging && 'opacity-30 scale-[0.98] border-dashed border-gray-400 dark:border-gray-500',
        isDragOver && 'ring-2 ring-blue-500/80 bg-blue-50/30 dark:bg-blue-950/20'
      )}
    >
      {/* Quick Actions */}
      {!isEditing && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-150 z-10 bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm p-1 rounded-lg border border-gray-200 dark:border-surface-700 shadow-sm">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="수정"
            className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Copy Button */}
          <button
            type="button"
            onClick={() => handleCopy(item.content || item.title || '')}
            title="내용 복사"
            className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800 transition"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {/* 10-Minute Share Link Button (File type only) */}
          {item.type === 'file' && (
            <button
              type="button"
              onClick={handleGenerateShareLink}
              disabled={sharing}
              title="10분 공유 링크 생성 및 복사"
              className={cn(
                "p-1 rounded-md transition flex items-center",
                shareCopied 
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" 
                  : "text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              )}
            >
              {sharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : shareCopied ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {/* Archive Toggle Button */}
          <button
            type="button"
            onClick={() => onToggleArchive(item.id, item.is_archived)}
            title={item.is_archived ? '보관 해제' : '보관함으로 이동'}
            className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800 transition"
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
            onClick={() => onDelete(item.id, allStoragePaths.length > 0 ? allStoragePaths : item.metadata?.file?.storagePath)}
            title="삭제"
            className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition"
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
        <div className="flex-1 min-w-0 pr-2 sm:pr-14">
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
                <div className="space-y-2">
                  {/* 10분 공유 링크 복사 완료 피드백 알림 배너 */}
                  {shareCopied && (
                    <div className="p-2 px-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fade-in font-medium">
                      <div className="flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>⏱️ 10분 유효 공유 링크가 복사되었습니다!</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        10분 후 자동 만료
                      </span>
                    </div>
                  )}

                  {/* 사용자가 작성한 별도 메모/제목이 있을 때 표시 */}
                  {item.title && filesList.length > 0 && !filesList.some((f) => f.name === item.title) && (
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                      {item.title}
                    </p>
                  )}

                  {filesList.length > 1 ? (
                    /* 다중 파일 카드 UI */
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30 space-y-3">
                      {/* 헤더: 파일 개수, 총 용량 / 버튼들 (모바일 반응형 2단 분기) */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-amber-200/60 dark:border-amber-900/40 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-200">
                          <FileIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>첨부 파일 {filesList.length}개</span>
                          <span className="text-[11px] text-amber-700/70 dark:text-amber-400/70 font-normal">
                            ({formatBytes(filesList.reduce((acc, f) => acc + (f.size || 0), 0))})
                          </span>
                        </div>

                        {/* 버튼 그룹 (모바일에서 전폭/가로 균등 분할로 터치 및 가시성 극대화) */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleGenerateShareLink}
                            disabled={sharing}
                            className={cn(
                              "flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-xs transition flex items-center justify-center gap-1.5 shrink-0",
                              shareCopied
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-white dark:bg-surface-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 border-amber-300/70 dark:border-amber-800/60"
                            )}
                            title="누구나 10분간 다운로드 가능한 안전 공유 링크 복사"
                          >
                            {sharing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            ) : shareCopied ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                            <span>{shareCopied ? '링크 복사됨!' : '10분 공유 링크'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadAll}
                            disabled={downloadingAll || isExpired}
                            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:opacity-90 shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                          >
                            {downloadingAll ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:text-gray-900" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>{downloadingAll ? '다운로드 중...' : '전체 다운로드'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 개별 파일 목록 */}
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                        {filesList.map((file, fIdx) => (
                          <div
                            key={`${file.storagePath}-${fIdx}`}
                            className="flex items-center justify-between gap-2 p-2 px-2.5 bg-white/95 dark:bg-surface-800/95 rounded-lg border border-amber-200/40 dark:border-amber-900/20 text-xs hover:border-amber-300 dark:hover:border-amber-800/50 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                              <FileIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate font-medium text-gray-800 dark:text-gray-200" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                                ({formatBytes(file.size)})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleGenerateSingleFileShareLink(file)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-surface-700 rounded-md transition"
                                title="이 파일 10분 공유 링크 복사"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadTargetFile(file)}
                                disabled={downloadingPath === file.storagePath || isExpired}
                                className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-700 rounded-md transition disabled:opacity-50 flex items-center gap-1"
                                title="이 파일 다운로드"
                              >
                                {downloadingPath === file.storagePath ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span className="text-[11px] hidden md:inline">다운로드</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 단일 파일 카드 UI (모바일에서 버튼이 파일명을 가리지 않도록 2열 반응형 개선) */
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* 파일 정보 영역 (모바일에서도 100% 가로 너비 확보하여 긴 파일명도 시원하게 표시) */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg shrink-0 mt-0.5">
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all sm:truncate leading-snug" title={filesList[0]?.name || item.title || ''}>
                            {filesList[0]?.name || item.title || item.metadata?.file?.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                            {filesList[0]?.size
                              ? formatBytes(filesList[0].size)
                              : item.metadata?.file?.size
                                ? formatBytes(item.metadata.file.size)
                                : '파일'}
                          </p>
                        </div>
                      </div>

                      {/* 버튼 그룹 (모바일에서는 파일 정보 아래에 시원하게 배치되어 파일명을 절대 가리지 않음) */}
                      <div className="flex items-center gap-2 shrink-0 pt-2.5 sm:pt-0 border-t border-amber-200/50 dark:border-amber-900/30 sm:border-t-0 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleGenerateShareLink}
                          disabled={sharing}
                          className={cn(
                            "flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50",
                            shareCopied
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-white dark:bg-surface-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 border-amber-300/70 dark:border-amber-800/60"
                          )}
                          title="누구나 10분간 다운로드 가능한 안전 공유 링크 복사"
                        >
                          {sharing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          ) : shareCopied ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                          <span>{shareCopied ? '링크 복사됨!' : '10분 공유 링크'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => filesList[0] && downloadTargetFile(filesList[0])}
                          disabled={downloadingPath === filesList[0]?.storagePath || isExpired}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:opacity-90 shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {downloadingPath === filesList[0]?.storagePath ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:text-gray-900" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{downloadingPath === filesList[0]?.storagePath ? '준비중...' : '다운로드'}</span>
                        </button>
                      </div>
                    </div>
                  )}
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
