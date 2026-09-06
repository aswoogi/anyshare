'use client';

import React, { useState } from 'react';
import { Item, CategoryFilterType, UpdateItemInput } from '@/types/item';
import { ItemCard } from './ItemCard';
import { Inbox, Archive, Loader2, FilterX } from 'lucide-react';

interface FeedListProps {
  items: Item[];
  loading: boolean;
  activeTab: 'active' | 'archive';
  selectedCategory: CategoryFilterType;
  onToggleComplete: (id: string, current: boolean) => void;
  onToggleArchive: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath?: string) => void;
  onUpdate: (id: string, updates: UpdateItemInput) => void;
  onReorder: (reorderedList: Item[]) => void;
}

export function FeedList({
  items,
  loading,
  activeTab,
  selectedCategory,
  onToggleComplete,
  onToggleArchive,
  onDelete,
  onUpdate,
  onReorder,
}: FeedListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 1. Filter by Tab (Active vs Archive)
  const tabItems = items.filter((item) =>
    activeTab === 'active' ? !item.is_archived : item.is_archived
  );

  // 2. Filter by Category
  const displayItems = tabItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.type === selectedCategory;
  });

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag preview for smoother feel
    if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedItem = displayItems[draggedIndex];
    if (!draggedItem) return;

    // Create new reordered display array
    const newDisplay = [...displayItems];
    newDisplay.splice(draggedIndex, 1);
    newDisplay.splice(targetIndex, 0, draggedItem);

    // If viewing all, newDisplay is directly tabItems
    if (selectedCategory === 'all') {
      onReorder(newDisplay);
    } else {
      // Re-map into the full items array
      const otherItems = items.filter((it) => !newDisplay.some((d) => d.id === it.id));
      onReorder([...newDisplay, ...otherItems]);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (loading && items.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-xs">데이터 동기화 중...</p>
      </div>
    );
  }

  if (displayItems.length === 0) {
    const getEmptyCategoryMessage = () => {
      switch (selectedCategory) {
        case 'todo': return '등록된 할 일이 없습니다';
        case 'link': return '보관된 링크가 없습니다';
        case 'file': return '공유 중인 파일이 없습니다';
        case 'text': return '작성된 메모가 없습니다';
        default: return activeTab === 'active' ? '기록된 항목이 없습니다' : '보관함이 비어 있습니다';
      }
    };

    return (
      <div className="py-16 flex flex-col items-center justify-center text-center px-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-surface-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-3">
          {selectedCategory !== 'all' ? (
            <FilterX className="w-6 h-6 stroke-[1.5]" />
          ) : activeTab === 'active' ? (
            <Inbox className="w-6 h-6 stroke-[1.5]" />
          ) : (
            <Archive className="w-6 h-6 stroke-[1.5]" />
          )}
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {getEmptyCategoryMessage()}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs leading-relaxed">
          {selectedCategory !== 'all'
            ? '상단 인풋에 새 항목을 추가하거나 다른 카테고리를 선택해 보세요.'
            : activeTab === 'active'
            ? '상단 인풋에 텍스트, 링크를 입력하거나 클립보드에서 바로 붙여넣기(Ctrl+V)해 보세요.'
            : '완료되었거나 보관 처리한 항목들이 여기에 모입니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {displayItems.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          index={index}
          onToggleComplete={onToggleComplete}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          isDragging={draggedIndex === index}
          isDragOver={dragOverIndex === index}
        />
      ))}
    </div>
  );
}
