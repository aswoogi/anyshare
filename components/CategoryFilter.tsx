'use client';

import React from 'react';
import { CategoryFilterType, Item } from '@/types/item';
import { cn } from '@/lib/utils';
import { CheckSquare, Globe, FileText, Paperclip, LayoutGrid } from 'lucide-react';

interface CategoryFilterProps {
  currentCategory: CategoryFilterType;
  onSelectCategory: (category: CategoryFilterType) => void;
  items: Item[];
}

export function CategoryFilter({
  currentCategory,
  onSelectCategory,
  items,
}: CategoryFilterProps) {
  // Compute counts for the current tab's items
  const counts = {
    all: items.length,
    todo: items.filter((i) => i.type === 'todo').length,
    link: items.filter((i) => i.type === 'link').length,
    text: items.filter((i) => i.type === 'text').length,
    file: items.filter((i) => i.type === 'file').length,
  };

  const categories: { key: CategoryFilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: '전체', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: 'todo', label: '할 일', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { key: 'link', label: '링크', icon: <Globe className="w-3.5 h-3.5" /> },
    { key: 'text', label: '메모', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'file', label: '파일', icon: <Paperclip className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
      {categories.map((cat) => {
        const isActive = currentCategory === cat.key;
        const count = counts[cat.key];

        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelectCategory(cat.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-150 select-none font-medium',
              isActive
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 bg-gray-100/70 dark:bg-surface-800/80 hover:bg-gray-200/60 dark:hover:bg-surface-700/60'
            )}
          >
            {cat.icon}
            <span>{cat.label}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                isActive
                  ? 'bg-white/20 dark:bg-black/20 text-white dark:text-gray-900'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
