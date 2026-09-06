'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          onSuccess?.();
          onClose();
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          onSuccess?.();
          onClose();
        } else {
          setSuccessMsg(
            '회원가입이 완료되었습니다. 이메일 확인 메일이 발송되었거나, 확인이 비활성화된 경우 바로 로그인하실 수 있습니다.'
          );
          setMode('login');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || '인증 중 문제가 발생했습니다.';
      if (msg.includes('Invalid login credentials')) {
        msg = '이메일 또는 비밀번호가 일치하지 않습니다. (아직 가입하지 않으셨다면 [회원가입] 탭을 눌러주세요)';
      } else if (msg.includes('Invalid API key')) {
        msg = 'Supabase API 키가 유효하지 않습니다. Vercel 또는 .env.local의 NEXT_PUBLIC_SUPABASE_ANON_KEY 설정을 확인해 주세요.';
      } else if (msg.includes('User already registered')) {
        msg = '이미 가입된 이메일입니다. [로그인] 탭에서 로그인해 주세요.';
      } else if (msg.includes('Password should be at least')) {
        msg = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-floating border border-black/[0.08] dark:border-white/[0.08]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'login' ? 'AnyShare 로그인' : 'AnyShare 계정 생성'}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            모든 기기에서 나만의 데이터를 안전하게 동기화합니다
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-gray-100 dark:bg-surface-800 p-0.5 rounded-lg mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition ${
              mode === 'login'
                ? 'bg-white dark:bg-surface-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition ${
              mode === 'signup'
                ? 'bg-white dark:bg-surface-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상 비밀번호"
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 dark:text-red-400 pt-1 leading-relaxed">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-green-600 dark:text-green-400 pt-1 leading-relaxed">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              '로그인'
            ) : (
              '계정 만들기'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
