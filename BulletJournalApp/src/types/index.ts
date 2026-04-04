export type EntryType = 'task' | 'event' | 'note' | 'goal-yearly' | 'goal-monthly'; // goal-monthly는 레거시, goal-yearly로 통합
export type EntryStatus = 'todo' | 'done' | 'progress' | 'migrated' | 'migrated_up' | 'cancelled';
export type EntryPriority = 'none' | 'important' | 'urgent' | 'urgent-important';

export interface Entry {
  id: string;
  text: string;
  type: EntryType;
  status: EntryStatus;
  priority: EntryPriority;
  date: string;         // YYYY-MM-DD
  startDate?: string;   // for Gantt: defaults to date
  endDate?: string;     // for Gantt: defaults to date
  time?: string;
  endTime?: string;
  allDay?: boolean;
  createdAt: number;
  tags?: string[];
  memo?: string;
  notionPageId?: string;
  notionLastSync?: number;
  recurring?: RecurringConfig;
  subtasks?: Subtask[];
  migrateCount?: number;
  originalDate?: string;  // 밀린 항목 배치 시 원래 날짜 보관 (✕ 해제 시 복원용)
  linkedEntryId?: string; // 상위 이관 시 원본 항목 ID
  linkedGoalId?: string;  // 이 항목이 연결된 목표 ID
  targetCount?: number;   // 목표 달성에 필요한 횟수
  updatedAt?: number;
  editHistory?: { text: string; memo?: string; editedAt: number }[];
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;     // every N days/weeks/months
  endDate?: string;
}

export interface Goal {
  id: string;
  text: string;
  year: number;
  month?: number | null;
  done: boolean;
  updatedAt?: number;
}

export interface NotionConfig {
  accessToken: string;
  databaseId: string;
  connected: boolean;
  lastSync?: number;
}

export type ViewType = 'all' | 'daily' | 'weekly' | 'monthly' | 'annual' | 'gantt' | 'notes' | 'stats';

export interface ModalState {
  mode: 'add' | 'edit';
  entry?: Entry;
  scope?: 'daily' | 'monthly';
  date?: string;
  year?: number;
  month?: number;
  defaultType?: EntryType;
  defaultTime?: string;
  hideGoalType?: boolean;
}
