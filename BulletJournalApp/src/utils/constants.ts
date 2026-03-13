export const COLORS = {
  bg: '#faf6f0',
  bgWhite: '#ffffff',
  primary: '#2c2416',
  accent: '#c0583f',
  blue: '#3a7ca5',
  green: '#4a8c3f',
  amber: '#c0883f',
  textPrimary: '#2c2416',
  textSecondary: '#6b5d4d',
  textMuted: '#b8a99a',
  textLight: '#ccc4b8',
  border: '#ddd5c9',
  borderLight: '#ebe5dc',
  cardShadow: 'rgba(44,36,22,0.06)',
  headerBg: '#2c2416',
  headerText: '#faf6f0',
} as const;

export const STATUS = {
  todo:        { symbol: '·', label: '할 일',    color: '#2c2416' },
  done:        { symbol: '×', label: '완료',     color: '#4a8c3f' },
  progress:    { symbol: '/', label: '진행 중',  color: '#c0883f' },
  migrated:    { symbol: '>', label: '이관 →',   color: '#3a7ca5' },
  migrated_up: { symbol: '<', label: '상위 이관', color: '#3a7ca5' },
  cancelled:   { symbol: '·', label: '취소',     color: '#b8a99a', strike: true },
} as const;

export const TYPES = {
  task:  { symbol: '·', label: '할 일' },
  event: { symbol: '○', label: '일정' },
  note:  { symbol: '—', label: '메모' },
} as const;

export const PRIORITY = {
  none:      { symbol: '',  label: '없음' },
  important: { symbol: '★', label: '중요' },
  urgent:    { symbol: '!',  label: '긴급' },
} as const;

export const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
export const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export const STATUS_CYCLE: Array<'todo' | 'progress' | 'done' | 'migrated' | 'cancelled'> = [
  'todo', 'progress', 'done', 'migrated', 'cancelled'
];
