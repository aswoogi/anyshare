'use client';

import React from 'react';
import { Radio, User, LogOut, LogIn } from 'lucide-react';
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
}: HeaderProps) {
  return (
    <header className="pt-8 pb-4">
      {/* Title, User status, Realtime indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            AnyShare
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-100 dark:bg-surface-800 text-gray-500">
              Personal Archive
            </span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            기억해야 할 모든 것들을 즉시 캡처하고 동기화합니다
          </p>
        </div>

        {/* Right side: User Profile & Realtime status */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80 dark:bg-surface-800 border border-black/[0.04] dark:border-white/[0.05] text-xs">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span className="max-w-[120px] truncate text-gray-700 dark:text-gray-300 font-medium">
                {currentUser.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                title="로그아웃"
                className="ml-1 p-0.5 text-gray-400 hover:text-red-500 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-medium transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>로그인</span>
            </button>
          )}

          {/* Realtime Live Pulse */}
          <div
            className="flex items-center gap-1.5 text-[11px] text-gray-400 px-2 py-1 rounded-full bg-gray-50 dark:bg-surface-800 border border-black/[0.04] dark:border-white/[0.05]"
            title={isConnected ? '실시간 동기화 활성화됨' : '실시간 연결 중...'}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              )}
            />
            <span className="font-mono">{isConnected ? 'LIVE' : 'SYNC'}</span>
          </div>
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
