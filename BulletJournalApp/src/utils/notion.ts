import { Entry, NotionConfig } from '../types';
import { uid } from './date';

const NOTION_API = 'https://api.notion.com/v1';

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
  last_edited_time: string;
}

export async function queryNotionDatabase(config: NotionConfig): Promise<Entry[]> {
  const res = await fetch(`${NOTION_API}/databases/${config.databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sorts: [{ property: 'Date', direction: 'ascending' }],
    }),
  });

  if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
  const data = await res.json();
  return data.results.map(mapNotionToEntry);
}

export async function createNotionPage(config: NotionConfig, entry: Entry): Promise<string> {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: config.databaseId },
      properties: mapEntryToNotion(entry),
    }),
  });

  if (!res.ok) throw new Error(`Notion create error: ${res.status}`);
  const data = await res.json();
  return data.id;
}

export async function updateNotionPage(config: NotionConfig, pageId: string, entry: Partial<Entry>): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: mapEntryToNotion(entry as Entry),
    }),
  });

  if (!res.ok) throw new Error(`Notion update error: ${res.status}`);
}

function mapNotionToEntry(page: NotionPage): Entry {
  const props = page.properties as Record<string, any>;

  const title = props['Name']?.title?.[0]?.plain_text || props['제목']?.title?.[0]?.plain_text || '';
  const date = props['Date']?.date?.start || props['날짜']?.date?.start || '';
  const endDate = props['Date']?.date?.end || props['날짜']?.date?.end || undefined;
  const status = mapNotionStatus(props['Status']?.select?.name || props['상태']?.select?.name || '');
  const priority = mapNotionPriority(props['Priority']?.select?.name || props['우선순위']?.select?.name || '');
  const type = mapNotionType(props['Type']?.select?.name || props['유형']?.select?.name || '');

  return {
    id: uid(),
    text: title,
    type,
    status,
    priority,
    date: date.slice(0, 10),
    endDate: endDate?.slice(0, 10),
    createdAt: new Date(page.last_edited_time).getTime(),
    notionPageId: page.id,
    notionLastSync: Date.now(),
  };
}

function mapEntryToNotion(entry: Entry): Record<string, unknown> {
  const props: Record<string, unknown> = {
    'Name': { title: [{ text: { content: entry.text } }] },
  };

  if (entry.date) {
    props['Date'] = {
      date: {
        start: entry.date,
        end: entry.endDate || undefined,
      },
    };
  }

  if (entry.status) {
    props['Status'] = { select: { name: reverseMapStatus(entry.status) } };
  }

  if (entry.priority && entry.priority !== 'none') {
    props['Priority'] = { select: { name: reverseMapPriority(entry.priority) } };
  }

  return props;
}

function mapNotionStatus(s: string): Entry['status'] {
  const map: Record<string, Entry['status']> = {
    'To Do': 'todo', '할 일': 'todo', 'Not started': 'todo',
    'Done': 'done', '완료': 'done', 'Complete': 'done',
    'In Progress': 'progress', '진행 중': 'progress',
    'Cancelled': 'cancelled', '취소': 'cancelled',
  };
  return map[s] || 'todo';
}

function mapNotionPriority(s: string): Entry['priority'] {
  const map: Record<string, Entry['priority']> = {
    'High': 'urgent', '긴급': 'urgent', 'Urgent': 'urgent',
    'Medium': 'important', '중요': 'important', 'Important': 'important',
    'Low': 'none', '없음': 'none', 'None': 'none',
  };
  return map[s] || 'none';
}

function mapNotionType(s: string): Entry['type'] {
  const map: Record<string, Entry['type']> = {
    'Task': 'task', '할 일': 'task',
    'Event': 'event', '일정': 'event',
    'Note': 'note', '메모': 'note',
  };
  return map[s] || 'task';
}

function reverseMapStatus(s: Entry['status']): string {
  const map: Record<string, string> = {
    todo: 'To Do', done: 'Done', progress: 'In Progress',
    migrated: 'To Do', migrated_up: 'To Do', cancelled: 'Cancelled',
  };
  return map[s] || 'To Do';
}

function reverseMapPriority(s: Entry['priority']): string {
  const map: Record<string, string> = {
    none: 'None', important: 'Medium', urgent: 'High',
  };
  return map[s] || 'None';
}
