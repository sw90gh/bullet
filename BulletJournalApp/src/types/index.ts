export type EntryType = 'task' | 'event' | 'note';
export type EntryStatus = 'todo' | 'done' | 'progress' | 'migrated' | 'migrated_up' | 'cancelled';
export type EntryPriority = 'none' | 'important' | 'urgent';

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
  createdAt: number;
  tags?: string[];
  memo?: string;
  notionPageId?: string;
  notionLastSync?: number;
  recurring?: RecurringConfig;
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
}

export interface NotionConfig {
  accessToken: string;
  databaseId: string;
  connected: boolean;
  lastSync?: number;
}

export type ViewType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'gantt' | 'notes';

export interface ModalState {
  mode: 'add' | 'edit' | 'add-goal' | 'edit-goal';
  entry?: Entry;
  goal?: Goal;
  scope?: 'daily' | 'monthly' | 'goal';
  date?: string;
  year?: number;
  month?: number;
}
