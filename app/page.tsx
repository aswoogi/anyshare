'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { QuickInputBar } from '@/components/QuickInputBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { FeedList } from '@/components/FeedList';
import { AuthModal } from '@/components/AuthModal';
import { StorageUsageModal } from '@/components/StorageUsageModal';
import { useItemsRealtime } from '@/hooks/useItemsRealtime';
import { useGlobalPaste } from '@/hooks/useGlobalPaste';
import { CategoryFilterType } from '@/types/item';
import { formatBytes } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

function MainFeedContent() {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterType>('all');
  const [pastePayload, setPastePayload] = useState<{ text?: string; file?: File } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const searchParams = useSearchParams();

  const {
    items,
    currentUser,
    loading,
    isConnected,
    addItem,
    updateItem,
    reorderItems,
    toggleComplete,
    toggleArchive,
    deleteItem,
    signOut,
  } = useItemsRealtime();

  // Compute total file storage usage
  const totalStorageBytes = items
    .filter((it) => it.type === 'file')
    .reduce((acc, it) => acc + Number(it.metadata?.file?.size || 0), 0);
  const totalStorageText = formatBytes(totalStorageBytes);

  // PWA Web Share Target Handler
  useEffect(() => {
    const sharedUrl = searchParams.get('url');
    const sharedText = searchParams.get('text');
    const sharedTitle = searchParams.get('title');

    const combined = [sharedUrl, sharedText, sharedTitle].filter(Boolean).join(' ');
    if (combined.trim()) {
      if (!currentUser) {
        setIsAuthOpen(true);
      } else {
        setPastePayload({ text: combined.trim() });
      }
    }
  }, [searchParams, currentUser]);

  // Handle Global Paste (Ctrl+V / Cmd+V)
  const handlePasteText = useCallback(
    (text: string) => {
      if (!currentUser) {
        setIsAuthOpen(true);
        return;
      }
      setPastePayload({ text });
    },
    [currentUser]
  );

  const handlePasteFile = useCallback(
    (file: File) => {
      if (!currentUser) {
        setIsAuthOpen(true);
        return;
      }
      setPastePayload({ file });
    },
    [currentUser]
  );

  useGlobalPaste({
    onPasteText: handlePasteText,
    onPasteFile: handlePasteFile,
  });

  const activeCount = items.filter((item) => !item.is_archived).length;
  const archiveCount = items.filter((item) => item.is_archived).length;

  // Current tab items for category counts
  const currentTabItems = items.filter((item) =>
    activeTab === 'active' ? !item.is_archived : item.is_archived
  );

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 pb-24">
      {/* Top Header with 2 Minimal Tabs & Auth State & Storage Monitor */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        activeCount={activeCount}
        archiveCount={archiveCount}
        isConnected={isConnected}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={signOut}
        onOpenStorage={() => setIsStorageModalOpen(true)}
        totalStorageText={totalStorageText}
      />

      {/* Smart Quick Input Bar (Always accessible at top) */}
      <div className="sticky top-4 z-20 my-5">
        <QuickInputBar
          onAddItem={addItem}
          externalContent={pastePayload}
          onClearExternalContent={() => setPastePayload(null)}
          isLoggedIn={!!currentUser}
          onRequireAuth={() => setIsAuthOpen(true)}
        />
      </div>

      {/* When NOT logged in: Show privacy & login CTA */}
      {!currentUser && !loading ? (
        <div className="py-16 px-6 text-center bg-white dark:bg-surface-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-subtle my-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            로그인 후 나만의 안전한 아카이브를 이용하세요
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            AnyShare는 계정별로 데이터를 완벽히 격리하여 다른 사용자에게 노출되지 않도록 안전하게 보호합니다.
          </p>
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="mt-5 px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-sm"
          >
            로그인 / 계정 생성하기
          </button>
        </div>
      ) : (
        <>
          {/* Category Pills Filter Bar */}
          <div className="mb-4">
            <CategoryFilter
              currentCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              items={currentTabItems}
            />
          </div>

          {/* Minimal Feed Cards List */}
          <div>
            <FeedList
              items={items}
              loading={loading}
              activeTab={activeTab}
              selectedCategory={selectedCategory}
              onToggleComplete={toggleComplete}
              onToggleArchive={toggleArchive}
              onDelete={deleteItem}
              onUpdate={updateItem}
              onReorder={reorderItems}
            />
          </div>
        </>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => setIsAuthOpen(false)}
      />

      {/* Storage & DB Usage Modal */}
      <StorageUsageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        items={items}
        isLoggedIn={!!currentUser}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground transition-colors">
      <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">로딩 중...</div>}>
        <MainFeedContent />
      </Suspense>
    </main>
  );
}
