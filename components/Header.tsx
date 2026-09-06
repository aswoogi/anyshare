'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, LogIn, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface HeaderProps {
  activeTab: 'active' | 'archive';
  onTabChange: (tab: 'active' | 'archive') => void;
  activeCount: number;
  archiveCount: number;
  isConnected: boolean;
  currentUser: SupabaseUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenStorage?: () => void;
  totalStorageText?: string;
}

export function Header({
  activeTab,
  onTabChange,
  activeCount,
  archiveCount,
  isConnected,
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenStorage,
  totalStorageText,
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="pt-8 pb-4">
      {/* Title & Top Right Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            AnyShare
          </h1>
        </div>

        {/* Right side icons: Storage, Realtime, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Storage Usage Icon Button */}
          {onOpenStorage && (
            <button
              type="button"
              onClick={onOpenStorage}
              title={`저장 용량 현황 (${totalStorageText || '0 B'})`}
              className="p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800 transition"
            >
              <HardDrive className="w-4 h-4 text-amber-500" />
            </button>
          )}

          {/* 2. Realtime Status Indicator (Icon Only) */}
          <div
            className="p-2 rounded-full flex items-center justify-center cursor-default"
            title={isConnected ? '실시간 동기화 연결됨 (LIVE)' : '실시간 연결 중...'}
          >
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              )}
            />
          </div>

          {/* 3. User Profile Dropdown (Icon Only by default, reveals ID on click) */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                title="계정 정보"
                className={cn(
                  'p-2 rounded-full transition-colors flex items-center justify-center',
                  isUserMenuOpen
                    ? 'bg-gray-200 dark:bg-surface-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800'
                )}
              >
                <User className="w-4 h-4" />
              </button>

              {/* Popover Menu on click */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-900 rounded-xl p-3 shadow-floating border border-black/[0.08] dark:border-white/[0.08] z-30 animate-fade-in">
                  <div className="px-1 py-1 border-b border-gray-100 dark:border-surface-800 mb-2">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      로그인된 계정
                    </p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mt-0.5">
                      {currentUser.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition font-medium text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              title="로그인"
              className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Two Minimal Tabs: Active / Archive */}
      <div className="flex items-center border-b border-gray-200/80 dark:border-surface-800 text-sm">
        <button
          type="button"
          onClick={() => onTabChange('active')}
          className={cn(
            'pb-2.5 px-3 font-medium transition-all relative flex items-center gap-2',
            activeTab === 'active'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          )}
        >
          <span>진행 중</span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.2 rounded-full',
              activeTab === 'active'
                ? 'bg-gray-100 text-gray-800 dark:bg-surface-800 dark:text-gray-200'
                : 'bg-transparent text-gray-400'
            )}
          >
            {activeCount}
          </span>
          {activeTab === 'active' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 dark:bg-white rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('archive')}
          className={cn(
            'pb-2.5 px-3 font-medium transition-all relative flex items-center gap-2',
            activeTab === 'archive'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          )}
        >
          <span>보관함</span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.2 rounded-full',
              activeTab === 'archive'
                ? 'bg-gray-100 text-gray-800 dark:bg-surface-800 dark:text-gray-200'
                : 'bg-transparent text-gray-400'
            )}
          >
            {archiveCount}
          </span>
          {activeTab === 'archive' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 dark:bg-white rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}
