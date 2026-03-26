import { useState, useEffect, useCallback } from 'react';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;  // ISO datetime or date
  end: string;
  startTime?: string;  // HH:MM
  endTime?: string;
  date: string;  // YYYY-MM-DD
  allDay: boolean;
  htmlLink?: string;
}

const CACHE_KEY = 'bujo-gcal-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5분

export function useGoogleCalendar(accessToken: string | null, enabled: boolean) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (token: string) => {
    // 캐시 확인
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setEvents(data);
          return;
        }
      }
    } catch {}

    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&orderBy=startTime&maxResults=500`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('bujo-gat');
          setError('캘린더 권한이 만료되었습니다. 로그아웃 후 다시 로그인해주세요.');
        } else {
          setError(`캘린더 로드 실패 (${res.status})`);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      const parsed: GoogleCalendarEvent[] = (data.items || []).map((item: any) => {
        const allDay = !!item.start?.date;
        const startStr = item.start?.dateTime || item.start?.date || '';
        const endStr = item.end?.dateTime || item.end?.date || '';
        const startDate = allDay ? startStr : startStr.slice(0, 10);
        const startTime = allDay ? undefined : startStr.slice(11, 16);
        const endTime = allDay ? undefined : endStr.slice(11, 16);

        return {
          id: item.id,
          summary: item.summary || '(제목 없음)',
          start: startStr,
          end: endStr,
          startTime,
          endTime,
          date: startDate,
          allDay,
          htmlLink: item.htmlLink,
        };
      });

      setEvents(parsed);
      // 캐시 저장
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: parsed, timestamp: Date.now() }));
      } catch {}
    } catch (err) {
      setError('캘린더 연결 실패');
      console.error('[GoogleCalendar]', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setEvents([]);
      return;
    }
    fetchEvents(accessToken);
  }, [accessToken, enabled, fetchEvents]);

  const refresh = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    if (accessToken && enabled) fetchEvents(accessToken);
  }, [accessToken, enabled, fetchEvents]);

  return { events, loading, error, refresh };
}
