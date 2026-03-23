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

export const COLORS_DARK = {
  bg: '#1a1a1a',
  bgWhite: '#2a2a2a',
  primary: '#e8e0d4',
  accent: '#c0583f',
  blue: '#5a9cc5',
  green: '#5aac4f',
  amber: '#d0a85f',
  textPrimary: '#e8e0d4',
  textSecondary: '#a89888',
  textMuted: '#6b5d4d',
  textLight: '#4a4038',
  border: '#4a4440',
  borderLight: '#3d3630',
  cardShadow: 'rgba(0,0,0,0.3)',
  headerBg: '#1e1e1e',
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
  'goal-yearly':  { symbol: '◎', label: '연간목표' },
  'goal-monthly': { symbol: '◎', label: '월간목표' },
} as const;

export const PRIORITY = {
  none:      { symbol: '',  label: '없음' },
  important: { symbol: '★', label: '중요' },
  urgent:    { symbol: '!',  label: '긴급' },
} as const;

export const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
export const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export const STATUS_CYCLE: Array<'todo' | 'progress' | 'done' | 'cancelled'> = [
  'todo', 'progress', 'done', 'cancelled'
];
