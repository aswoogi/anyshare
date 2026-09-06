import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getRemainingTimeText(expiresAt: string | null): { text: string; isExpired: boolean } {
  if (!expiresAt) return { text: '', isExpired: false };
  const now = new Date().getTime();
  const expire = new Date(expiresAt).getTime();
  const diffMs = expire - now;

  if (diffMs <= 0) {
    return { text: '만료됨', isExpired: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    return { text: `${days}일 남음`, isExpired: false };
  }

  if (diffHours > 0) {
    return { text: `${diffHours}시간 남음`, isExpired: false };
  }

  return { text: `${diffMinutes}분 남음`, isExpired: false };
}

export function formatRemindTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `오늘 ${timeStr}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
}
