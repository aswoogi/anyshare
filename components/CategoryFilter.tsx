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
    <div className="bg-gray-200/60 dark:bg-surface-800/80 p-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] backdrop-blur-sm">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
        {categories.map((cat) => {
          const isActive = currentCategory === cat.key;
          const count = counts[cat.key];

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-200 select-none font-medium',
                isActive
                  ? 'bg-white text-gray-900 dark:bg-surface-900 dark:text-gray-50 shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/[0.04]'
              )}
            >
              {cat.icon}
              <span>{cat.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-mono transition-colors',
                  isActive
                    ? 'bg-gray-100 dark:bg-surface-800 text-gray-900 dark:text-gray-200 font-bold'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
