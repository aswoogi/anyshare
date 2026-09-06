'use client';

import React from 'react';
import { Item } from '@/types/item';
import { formatBytes } from '@/lib/utils';
import { 
  X, 
  HardDrive, 
  Database, 
  FileText, 
  Globe, 
  CheckSquare, 
  Paperclip,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface StorageUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  isLoggedIn: boolean;
}

export function StorageUsageModal({
  isOpen,
  onClose,
  items,
  isLoggedIn,
}: StorageUsageModalProps) {
  if (!isOpen) return null;

  // Supabase Free Tier Limits
  const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
  const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

  // Compute storage usage from files
  const fileItems = items.filter((it) => it.type === 'file');
  const totalStorageBytes = fileItems.reduce((acc, it) => {
    const sz = it.metadata?.file?.size || 0;
    return acc + Number(sz);
  }, 0);

  // Approximate DB usage based on item payload length (text + json metadata)
  const totalDbBytes = items.reduce((acc, it) => {
    const rawLen =
      (it.content?.length || 0) +
      (it.title?.length || 0) +
      JSON.stringify(it.metadata || {}).length +
      150; // overhead per row
    return acc + rawLen * 2; // rough UTF-16 byte estimate
  }, 0);

  const storagePercent = Math.min(
    100,
    parseFloat(((totalStorageBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(2))
  );
  const dbPercent = Math.min(
    100,
    parseFloat(((totalDbBytes / DB_LIMIT_BYTES) * 100).toFixed(2))
  );

  // Item counts by type
  const counts = {
    todo: items.filter((i) => i.type === 'todo').length,
    link: items.filter((i) => i.type === 'link').length,
    text: items.filter((i) => i.type === 'text').length,
    file: fileItems.length,
    archived: items.filter((i) => i.is_archived).length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-floating border border-black/[0.08] dark:border-white/[0.08]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              저장 공간 및 용량 현황
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Supabase 클라우드 자원 사용량 모니터링
            </p>
          </div>
        </div>

        {/* 1. Storage Usage Card */}
        <div className="bg-gray-50 dark:bg-surface-800/60 rounded-xl p-4 border border-black/[0.04] dark:border-white/[0.05] mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              <Paperclip className="w-4 h-4 text-amber-500" />
              <span>파일 스토리지 (Storage)</span>
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {formatBytes(totalStorageBytes)} <span className="font-normal text-gray-400">/ 1 GB</span>
            </span>
          </div>

          {/* Storage Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(storagePercent, 1)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
            <span>보관 중인 파일: {fileItems.length}개</span>
            <span>{storagePercent}% 사용 중</span>
          </div>
        </div>

        {/* 2. Database Usage Card */}
        <div className="bg-gray-50 dark:bg-surface-800/60 rounded-xl p-4 border border-black/[0.04] dark:border-white/[0.05] mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              <Database className="w-4 h-4 text-blue-500" />
              <span>데이터베이스 (PostgreSQL)</span>
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {formatBytes(totalDbBytes)} <span className="font-normal text-gray-400">/ 500 MB</span>
            </span>
          </div>

          {/* DB Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(dbPercent, 1)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
            <span>총 레코드 수: {items.length}개</span>
            <span>{dbPercent}% 사용 중</span>
          </div>
        </div>

        {/* 3. Items breakdown pills */}
        <div className="pt-3 border-t border-gray-100 dark:border-surface-800">
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-2.5">
            데이터 세부 현황
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> 할 일
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {counts.todo}개
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Globe className="w-3.5 h-3.5 text-emerald-500" /> 링크
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {counts.link}개
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <FileText className="w-3.5 h-3.5 text-gray-500" /> 메모
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {counts.text}개
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-surface-800/40">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" /> 보관된 항목
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {counts.archived}개
              </span>
            </div>
          </div>
        </div>

        {/* Tier Info Footer */}
        <div className="mt-5 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2 leading-relaxed">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <span>
            Supabase Free Tier 기준 <strong>1 GB 파일 스토리지</strong> 및 <strong>500 MB 데이터베이스</strong>가 무료로 제공되며, 만료된 파일은 삭제하여 여유 공간을 확보할 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
