export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const pad = (n: number) => String(n).padStart(2, '0');

export function getDaysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export function getWeekNumber(d: Date): number {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function getMonthWeekNumber(d: Date): number {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstMonday = new Date(first);
  const day = first.getDay();
  // 해당 월 첫 번째 월요일 구하기
  firstMonday.setDate(first.getDate() + ((8 - day) % 7));
  if (d < firstMonday) return 1;
  return Math.floor((d.getDate() - firstMonday.getDate()) / 7) + (day === 1 ? 1 : 2);
}

export function getWeekDates(y: number, m: number, d: number): Date[] {
  const dt = new Date(y, m, d);
  const day = dt.getDay();
  const mon = new Date(dt);
  mon.setDate(dt.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getTodayStr(): string {
  return formatDateKey(new Date());
}

export function daysBetween(a: string, b: string): number {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + n);
  return formatDateKey(d);
}
