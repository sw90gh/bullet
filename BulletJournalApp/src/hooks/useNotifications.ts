import { useEffect, useRef } from 'react';
import { Entry } from '../types';
import { formatDateKey } from '../utils/date';

const NOTIFIED_KEY = 'bujo-notified';

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch { return new Set(); }
}

function addNotified(key: string) {
  const set = getNotifiedSet();
  set.add(key);
  // 최대 200개 유지 (오래된 것 자동 정리)
  const arr = Array.from(set);
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

function showNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag: body, // 같은 내용 중복 방지
    });
  }
}

export function useNotifications(entries: Entry[], enabled: boolean) {
  const permissionGranted = useRef(false);

  // 권한 요청
  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      permissionGranted.current = true;
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        permissionGranted.current = p === 'granted';
      });
    }
  }, [enabled]);

  // 매분 체크
  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;

    const check = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const todayStr = formatDateKey(now);
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const notified = getNotifiedSet();

      for (const entry of entries) {
        if (!entry.time || entry.date !== todayStr) continue;
        if (entry.status === 'done' || entry.status === 'cancelled' || entry.status === 'migrated' || entry.status === 'migrated_up') continue;

        const notifyKey = `${entry.id}-${todayStr}-${entry.time}`;
        if (notified.has(notifyKey)) continue;

        if (entry.time === currentTime) {
          const typeLabel = entry.type === 'event' ? '일정' : '할 일';
          showNotification(
            `${typeLabel}: ${entry.text}`,
            `${currentTime} 시작`,
          );
          addNotified(notifyKey);
        }
      }
    };

    // 즉시 1회 + 매 30초마다 체크 (분 경계를 놓치지 않도록)
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [entries, enabled]);
}
