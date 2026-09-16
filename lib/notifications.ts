import { Item } from '@/types/item';

// Check if Notification API is supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Request permission from user
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return false;
  }
}

// Display uncompleted Todo items in the mobile notification tray
export async function syncTodoNotifications(todoItems: Item[]): Promise<{ count: number; success: boolean }> {
  if (!isNotificationSupported()) {
    return { count: 0, success: false };
  }

  // Ensure permission
  let permission = Notification.permission;
  if (permission === 'default') {
    const granted = await requestNotificationPermission();
    if (!granted) return { count: 0, success: false };
    permission = 'granted';
  }

  if (permission !== 'granted') {
    return { count: 0, success: false };
  }

  // Filter uncompleted active todos
  const pendingTodos = todoItems.filter((i) => i.type === 'todo' && !i.is_completed && !i.is_archived);

  try {
    let registration: ServiceWorkerRegistration | undefined | null = null;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.getRegistration();
    }

    if (pendingTodos.length === 0) {
      const title = 'AnyShare • 모든 할 일 완료! 🎉';
      const options: NotificationOptions = {
        body: '현재 대기 중인 할 일이 모두 완료되었습니다.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'anyshare-todo-summary',
      };

      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
      return { count: 0, success: true };
    }

    // Single Pinned Summary Notification (No individual cards)
    const topSummaryTitle = `AnyShare • 할 일 ${pendingTodos.length}개 대기 중`;
    const todoPreviewList = pendingTodos
      .slice(0, 5)
      .map((t, idx) => `${idx + 1}. ${t.title || t.content}`)
      .join('\n');
    const extraCount = pendingTodos.length > 5 ? ` 외 ${pendingTodos.length - 5}개 더 있음` : '';

    const summaryOptions: any = {
      body: `${todoPreviewList}${extraCount}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'anyshare-todo-summary',
      requireInteraction: false,
      renotify: true,
      data: {
        url: '/',
        type: 'todo_summary',
      },
    };

    if (registration && registration.showNotification) {
      await registration.showNotification(topSummaryTitle, summaryOptions);
    } else {
      new Notification(topSummaryTitle, summaryOptions);
    }

    return { count: pendingTodos.length, success: true };
  } catch (err) {
    console.error('Failed to trigger todo notification:', err);
    return { count: pendingTodos.length, success: false };
  }
}

// Check if current time matches scheduled hours (8:00, 13:00, 18:00) and hasn't notified yet in the current slot
export function checkAndTriggerScheduledNotification(todoItems: Item[]): void {
  if (typeof window === 'undefined' || !isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  const currentHour = now.getHours(); // 0 - 23
  const targetSlots = [8, 13, 18];

  // Find if current hour is one of the target slots (or within that hour window)
  const matchedSlot = targetSlots.find((h) => currentHour === h);
  if (matchedSlot === undefined) return;

  const todayDateStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const slotKey = `anyshare_notified_${todayDateStr}_${matchedSlot}`;

  if (localStorage.getItem(slotKey)) {
    // Already notified in this slot today
    return;
  }

  // Trigger notification and save slot
  syncTodoNotifications(todoItems).then((res) => {
    if (res.success && res.count > 0) {
      localStorage.setItem(slotKey, 'true');
    }
  });
}
