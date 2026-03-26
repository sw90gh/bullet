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

const CACHE_KEY = 'bujo-gcal-cache-v4'; // v4: 모든 캘린더에서 가져오기
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
      const headers = { Authorization: `Bearer ${token}` };

      // 1. 캘린더 목록 조회
      const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers });
      let calendarIds = ['primary'];
      if (calListRes.ok) {
        const calListData = await calListRes.json();
        calendarIds = (calListData.items || []).map((c: any) => c.id);
        console.log('[GCal] Found', calendarIds.length, 'calendars');
      }

      // 2. 모든 캘린더에서 이벤트 가져오기
      const allItems: any[] = [];
      for (const calId of calendarIds) {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?` +
          `timeMin=${encodeURIComponent(timeMin)}&` +
          `timeMax=${encodeURIComponent(timeMax)}&` +
          `singleEvents=true&orderBy=startTime&maxResults=200`;
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            allItems.push(...(data.items || []));
          }
        } catch {}
      }
      console.log('[GCal] Fetched', allItems.length, 'events from', calendarIds.length, 'calendars');
      const parsed: GoogleCalendarEvent[] = allItems.map((item: any) => {
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

      // 중복 제거 (여러 캘린더에서 같은 이벤트가 올 수 있음) + 날짜순 정렬
      const unique = Array.from(new Map(parsed.map(e => [e.id, e])).values())
        .sort((a, b) => a.date.localeCompare(b.date));
      setEvents(unique);
      // 캐시 저장
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: unique, timestamp: Date.now() }));
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
