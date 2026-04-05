const PIN_KEY = 'bujo-note-pin';
const LOCKED_FOLDERS_KEY = 'bujo-locked-folders';
const SESSION_KEY = 'bujo-pin-unlocked';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'bujo-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function setPin(pin: string): Promise<void> {
  const hashed = await hashPin(pin);
  localStorage.setItem(PIN_KEY, hashed);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return false;
  const hashed = await hashPin(pin);
  return hashed === stored;
}

export function hasPin(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function removePin(): void {
  localStorage.removeItem(PIN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function unlockSession(): void {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function lockSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// Folder lock management
export function getLockedFolders(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCKED_FOLDERS_KEY) || '[]');
  } catch { return []; }
}

export function setLockedFolders(folders: string[]): void {
  localStorage.setItem(LOCKED_FOLDERS_KEY, JSON.stringify(folders));
}

export function toggleFolderLock(folder: string): string[] {
  const locked = getLockedFolders();
  const idx = locked.indexOf(folder);
  if (idx >= 0) locked.splice(idx, 1);
  else locked.push(folder);
  setLockedFolders(locked);
  return locked;
}

export function isFolderLocked(folder: string): boolean {
  return getLockedFolders().includes(folder);
}
