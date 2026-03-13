# Bullet Journal PWA

## Project Overview
iPhone PWA 불렛저널 앱. Vite + React + TypeScript. Vercel 자동배포 (GitHub push → https://bullet-brown.vercel.app/)

## Architecture
- **Frontend**: `BulletJournalApp/` (Vite + React + TS)
- **Serverless API**: `BulletJournalApp/api/notion.js` (Vercel serverless function, **반드시 이 경로**. 루트 `api/`는 사용 안됨)
- **Data**: localStorage (`bujo-entries`, `bujo-goals`, `bujo-notion`, `bujo-auto-backup`)
- **Styling**: Inline styles via `getStyles(isDark)` + React Context (`useTheme()`)
- **Deploy**: Vercel, root `vercel.json`에서 `BulletJournalApp/` 서브디렉토리를 빌드

## Key Technical Decisions

### Dark Mode
- `DarkModeProvider` (React Context) → `useTheme()` 훅으로 모든 컴포넌트에 `{ styles, isDark, C }` 제공
- 12개 이상 컴포넌트가 `useTheme()` 사용. **절대 `import { styles } from '../styles/theme'` 직접 import 하지 말것** (항상 라이트 모드)
- `document.body.style.background` 동적 변경 (App.tsx useDarkMode)

### Notion Sync
- Token을 **query parameter** (`?token=xxx`)로 전달 (헤더 방식은 Vercel에서 strip됨)
- `BulletJournalApp/api/notion.js`가 실제 배포되는 파일 (CommonJS `module.exports`)
- Database ID는 UUID 형식으로 자동 변환 (`useNotionSync.ts` connect 함수)
- Token에서 whitespace trim + "Bearer " prefix 자동 제거
- query에서 sort 제거 (DB 속성명 불일치 방지)

### Sticky Header (iOS PWA)
- `position: sticky` 대신 **flex layout** 사용
- `app`: `display: flex; flexDirection: column; height: 100vh; overflow: hidden`
- `stickyTop`: `flexShrink: 0` (헤더+탭+태그필터)
- `main`: `flex: 1; overflowY: auto` (콘텐츠만 스크롤)
- `html, body, #root { height: 100%; overflow: hidden }` (index.html)

### Timeline Drag & Drop
- 터치 이벤트 기반 (touchstart/touchmove/touchend)
- 15분 단위 스냅
- 탭(5px 미만 이동) → 수정창, 드래그(5px 이상) → 시간만 변경 (수정창 안뜸)
- 겹치는 항목: 먼저 시작 → 뒤쪽, 나중 시작 → 12% 오른쪽 shift + 앞쪽 zIndex

### Swipe Actions (EntryRow)
- 좌→우: 우선순위 변경 (없음/중요/긴급)
- 우→좌: 이관/상위/수정/삭제
- 버튼에 `onTouchEnd` + `e.stopPropagation()` 필수 (iOS에서 onClick 안먹힘)
- 부모 `onTouchStart`에서 `target.tagName === 'BUTTON'`이면 스킵

## File Structure (주요)
```
BulletJournalApp/
  api/notion.js           ← Vercel serverless (실제 배포됨)
  index.html              ← 글로벌 CSS, PWA 설정
  src/
    App.tsx               ← 라우팅, 상태관리, DarkModeProvider
    hooks/
      useDarkModeContext.tsx ← DarkModeProvider + useTheme()
      useEntries.ts       ← entries CRUD
      useGoals.ts         ← goals CRUD
      useNotionSync.ts    ← Notion 연동 (token cleaning, UUID 변환)
    screens/
      DailyScreen.tsx     ← 목록/시간표 뷰, 드래그앤드롭
      WeeklyScreen.tsx
      MonthlyScreen.tsx
      AnnualScreen.tsx
      GanttScreen.tsx
      NotesScreen.tsx
      StatsScreen.tsx     ← 통계 (도넛차트, 주간완료율, 월별트렌드)
      SettingsScreen.tsx  ← 설정, Notion연동, 백업/복원
    components/
      Header.tsx
      EntryRow.tsx        ← 스와이프 액션 (우선순위/수정/삭제)
      EntryModal.tsx      ← 항목 추가/수정 (반복설정 포함)
      DailySummary.tsx    ← 미니 도넛차트 위젯
      SearchModal.tsx
      MigrateModal.tsx
      DeleteConfirm.tsx
    utils/
      constants.ts        ← COLORS, COLORS_DARK, STATUS, TYPES, PRIORITY
      date.ts
      storage.ts          ← localStorage CRUD + autoBackup
      notion.ts           ← Notion API 호출 (token via query param)
      recurring.ts        ← 반복 항목 생성
      quotes.ts           ← 500개 명언 (인간관계/성실/역경)
    styles/
      theme.ts            ← getStyles(isDark) - 모든 스타일 정의
    types/
      index.ts            ← Entry, Goal, NotionConfig, ViewType 등
api/notion.js             ← 루트 레벨 (Vercel에서 사용 안됨, BulletJournalApp/api가 실제)
vercel.json               ← 루트 Vercel 설정
```

## Features
- 일간/주간/월간/연간/간트/메모/통계 7개 뷰
- 상태 순환 (할일→진행→완료→취소)
- 우선순위 (없음/중요/긴급) - 스와이프로 변경
- 태그 필터링
- 마감일 D-day 표시
- 반복 항목 (매일/매주/매월)
- 자동 백업 (1시간마다)
- Notion 양방향 동기화
- 다크모드 (시스템/라이트/다크)
- 시간표 드래그앤드롭
- 검색
- 데이터 내보내기/가져오기
- 명언 표시 (500개, 일별 순환)

## Common Pitfalls
1. Vercel serverless는 `BulletJournalApp/api/`에 있어야 함 (루트 `api/` 아님)
2. Vercel serverless는 CommonJS (`module.exports`) 사용 (ESM `export default` 안됨)
3. Notion token은 헤더가 아닌 query parameter로 전달해야 함
4. `position: sticky`는 iOS PWA standalone 모드에서 안됨 → flex layout 사용
5. iOS에서 버튼 onClick이 부모 touch handler에 의해 씹힐 수 있음 → onTouchEnd + stopPropagation
6. 다크모드 스타일은 반드시 `useTheme()` 훅 사용 (정적 import 금지)
