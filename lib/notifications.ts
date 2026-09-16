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

    // 1. Post Top Summary Notification (Pinned card format)
    const topSummaryTitle = `AnyShare • 할 일 ${pendingTodos.length}개 대기 중`;
    const todoPreviewList = pendingTodos
      .slice(0, 4)
      .map((t, idx) => `${idx + 1}. ${t.title || t.content}`)
      .join('\n');
    const extraCount = pendingTodos.length > 4 ? ` 외 ${pendingTodos.length - 4}개 더 있음` : '';

    const summaryOptions: any = {
      body: `${todoPreviewList}${extraCount}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'anyshare-todo-summary',
      requireInteraction: true,
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

    // 2. Post top priority individual cards (up to 3 distinct cards in notification tray)
    for (const todo of pendingTodos.slice(0, 3)) {
      const cardTitle = `📌 ${todo.title || todo.content || '할 일'}`;
      const cardBody = (todo.content && todo.content !== todo.title) ? todo.content : 'AnyShare 할 일';

      const cardOptions: any = {
        body: cardBody,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: `anyshare-todo-${todo.id}`,
        requireInteraction: false,
        data: {
          url: '/',
          todoId: todo.id,
        },
      };

      if (registration && registration.showNotification) {
        await registration.showNotification(cardTitle, cardOptions);
      } else {
        new Notification(cardTitle, cardOptions);
      }
    }

    return { count: pendingTodos.length, success: true };
  } catch (err) {
    console.error('Failed to trigger todo notification:', err);
    return { count: pendingTodos.length, success: false };
  }
}
