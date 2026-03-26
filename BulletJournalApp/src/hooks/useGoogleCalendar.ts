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

const CACHE_KEY = 'bujo-gcal-cache-v3'; // v3: 범위 축소 (1개월 전~3개월 후)
const CACHE_TTL = 5 * 60 * 1000; // 5분

export function useGoogleCalendar(accessToken: string | null, enabled: boolean) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (token: string) => {
    // 캐시 확인 (빈 배열은 캐시 무시)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data) && data.length > 0) {
          console.log('[GCal] Using cache:', data.length, 'events');
          setEvents(data);
          return;
        }
      }
    } catch {}

    console.log('[GCal] Fetching from API...');
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&orderBy=startTime&maxResults=500`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[GCal] API response status:', res.status);
      if (!res.ok) {
        const errBody = await res.text();
        console.error('[GCal] API error:', res.status, errBody);
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
      console.log('[GCal] Fetched', data.items?.length || 0, 'events');
      const parsed: GoogleCalendarEvent[] = (data.items || []).map((item: any) => {
        const allDay = !!item.start?.date;
        const startStr = item.start?.dateTime || item.start?.date || '';
        const endStr = item.end?.dateTime || item.end?.date || '';

        // Date 객체로 파싱하여 로컬 시간 기준으로 변환
        let startDate: string, startTime: string | undefined, endTime: string | undefined;
        if (allDay) {
          startDate = startStr; // YYYY-MM-DD
          startTime = undefined;
          endTime = undefined;
        } else {
          const startDt = new Date(startStr);
          const endDt = new Date(endStr);
          const pad = (n: number) => String(n).padStart(2, '0');
          startDate = `${startDt.getFullYear()}-${pad(startDt.getMonth() + 1)}-${pad(startDt.getDate())}`;
          startTime = `${pad(startDt.getHours())}:${pad(startDt.getMinutes())}`;
          endTime = `${pad(endDt.getHours())}:${pad(endDt.getMinutes())}`;
        }

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
    console.log('[GCal] enabled:', enabled, 'hasToken:', !!accessToken);
    if (!enabled) {
      setEvents([]);
      return;
    }
    // 토큰 없으면 fetch만 스킵 (기존 캐시 데이터는 유지)
    if (!accessToken) return;
    fetchEvents(accessToken);
  }, [accessToken, enabled, fetchEvents]);

  const refresh = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('bujo-gcal-cache'); // 혹시 다른 키로 저장된 캐시도 정리
    if (accessToken && enabled) fetchEvents(accessToken);
  }, [accessToken, enabled, fetchEvents]);

  return { events, loading, error, refresh };
}
