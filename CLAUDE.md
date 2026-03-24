# Bullet Journal PWA

## Project Overview
iPhone PWA 불렛저널 앱. Vite + React + TypeScript. Vercel 자동배포 (GitHub push → https://bullet-brown.vercel.app/)

## Architecture
- **Frontend**: `BulletJournalApp/` (Vite + React + TS)
- **Serverless API**: `BulletJournalApp/api/notion.js` (Vercel serverless function, **반드시 이 경로**. 루트 `api/`는 사용 안됨)
- **Data**: localStorage (`bujo-entries`, `bujo-auto-backup`) + Firebase Firestore (로그인 시)
- **Auth**: Firebase Google Auth (`useAuth()` 훅)
- **Sync**: Firebase Firestore 실시간 동기화 (`useFirestoreSync()` 훅) — entries 단일 컬렉션
- **Styling**: Inline styles via `getStyles(isDark)` + React Context (`useTheme()`)
- **Deploy**: Vercel, root `vercel.json`에서 `BulletJournalApp/` 서브디렉토리를 빌드

## Key Technical Decisions

### Goal → Entry 통합
- **Goal 타입 제거**: 기존 `Goal` 인터페이스는 `Entry`로 통합됨
- `EntryType`에 `'goal-yearly' | 'goal-monthly'` 추가
- 기존 `bujo-goals` 데이터는 앱 로드 시 자동 마이그레이션 (`migrateGoalsToEntries()`)
- `bujo-goals-migrated` 플래그로 1회만 실행
- Firestore `users/{uid}/goals` 컬렉션은 더 이상 사용 안 함 (entries 단일 컬렉션)
- `useGoals` 훅은 미사용 (import 제거됨)
- 연간/월간 화면에서 `entries.filter(type === 'goal-yearly'/'goal-monthly')` 으로 필터

### Firebase Sync (Firestore)
- Firebase 프로젝트: `bulletjournal-5a9d6`
- Firestore 구조: `users/{uid}/entries` 단일 컬렉션 (goals 포함)
- **실시간 구독**: Firestore `onSnapshot`으로 원격 변경 실시간 반영
- **병합 전략**: `updatedAt` 기준 last-write-wins
- **초기 동기화**: 로컬 전용 항목 + 로컬이 더 최신인 항목만 diff 업로드
- **오프라인 삭제 추적**: localStorage에 `deletedEntryIds` 저장, 재연결 시 동기화
- **삭제 부활 방지** (3중 방어):
  1. `currentDeletedIds`: onSnapshot마다 localStorage에서 최신 삭제 목록 실시간 조회
  2. `wasLocal` 체크: prevRef에 있었는데 로컬에 없으면 부활 차단
  3. `isRemoteUpdate` 600ms: push effect(500ms) 경쟁 조건 방지
- **clearDeletedEntryIds**: Firestore 삭제 성공 후에만 호출 (네트워크 실패 시 보존)
- **디바운스**: 500ms 디바운스로 변경된 항목만 업로드
- **updatedAt 자동 보정**: 누락 시 자동 생성
- **동기화 상태 UI**: Header에 7px 원형 표시 (초록=완료, 주황=동기화중, 빨강=오류), 3초 auto-fade
- `syncStatus`는 `user`가 로그인된 경우에만 Header에 전달

### Google Auth
- `useAuth()` 훅: `{ user, loading, login, logout, error }` 반환
- `signInWithPopup()` 사용 (리다이렉트 방식도 `getRedirectResult()`로 폴백 처리)
- SettingsScreen에서 로그인/로그아웃 UI 제공
- 로그인 실패 시 `authError` 빨간 텍스트로 에러 표시

### Dark Mode
- `DarkModeProvider` (React Context) → `useTheme()` 훅으로 모든 컴포넌트에 `{ styles, isDark, C, statusColor }` 제공
- 12개 이상 컴포넌트가 `useTheme()` 사용. **절대 `import { styles } from '../styles/theme'` 직접 import 하지 말것** (항상 라이트 모드)
- `STATUS_DARK` 상수로 다크모드 전용 상태 색상 제공 (`statusColor()` 함수 사용)
- `document.body.style.background` 동적 변경 (App.tsx useDarkMode)

### Notifications
- `useNotifications` 훅: 30초마다 현재 시간과 오늘 항목의 `time` 비교
- `Notification API`로 브라우저 알림 표시 (앱이 열려있을 때만 동작)
- localStorage에 알림 발송 이력(`bujo-notified`) 저장 → 중복 방지
- 설정 화면에서 on/off 토글 (`bujo-notifications`)
- iOS 16.4+ PWA 홈화면 추가 시 지원

### Backup System
- 자동 백업: 1시간마다 localStorage에 자동 저장 (`autoBackup()`)
- 백업 알림 배너: 마지막 백업 후 3일 경과 시 상단에 알림 표시
- 공유 백업: iOS Web Share API (`navigator.share` + File) → 파일 앱/메모/카톡 등으로 JSON 백업
- 설정 화면에서도 "공유로 백업" 버튼 제공
- `markExported()`: 백업 완료 시 타임스탬프 기록

### Sticky Header (iOS PWA)
- `position: sticky` 대신 **flex layout** 사용
- `app`: `display: flex; flexDirection: column; height: 100vh; overflow: hidden`
- `stickyTop`: `flexShrink: 0` (헤더+탭+태그필터)
- `main`: `flex: 1; overflowY: auto` (콘텐츠만 스크롤)
- `html, body, #root { height: 100%; overflow: hidden }` (index.html)

### Tag Bar
- `flexWrap: wrap` + `maxHeight: 60px` (접힌 상태, ~2줄)
- 태그 6개 초과 시 "더보기/접기" 확장 버튼 표시
- `tagBarExpanded` 상태로 토글, 펼치면 `maxHeight: 'none'`

### Timeline Drag & Drop
- **터치 + 마우스** 이벤트 모두 지원 (touch* + onMouseDown)
- 15분 단위 스냅
- 탭(5px 미만 이동) → 수정창, 드래그(5px 이상) → 시간만 변경 (수정창 안뜸)
- 두 가지 드래그 모드: `'move'` (블록 이동), `'resize'` (하단 리사이즈)
- 미배정 항목도 타임라인으로 드래그 가능 (`handleUntimedMouseDown`)
- 겹치는 항목: 먼저 시작 → 뒤쪽, 나중 시작 → 12% 오른쪽 shift + 앞쪽 zIndex
- **자동 스크롤**: 드래그 중 뷰포트 상/하단 60px 영역 진입 시 자동 스크롤
  - `requestAnimationFrame` 루프로 매 프레임 스크롤 + 고스트 위치 업데이트
  - `lastTouchY` 추적으로 터치/마우스 모두 동작

### Swipe Actions (EntryRow)
- 좌→우: 우선순위 변경 (없음/중요/긴급)
- 우→좌: 이관/상위/수정/삭제
- **compact 모드에서도 스와이프 동작** (주간 뷰)
- **일간/주간/월간 모든 화면에서 동일한 스와이프** 지원
- **터치 + 마우스** 모두 지원 (`onTouchStart` + `onMouseDown`)
- **우클릭**: `onContextMenu`로 수정창 열기 (PC 지원)
- **롱프레스** (500ms): 수정창 열기
- **외부 클릭**: 스와이프 열린 상태에서 다른 곳 클릭 시 닫힘
- 버튼에 `onTouchEnd` + `e.stopPropagation()` 필수 (iOS에서 onClick 안먹힘)
- 부모 `onTouchStart`에서 `target.tagName === 'BUTTON'`이면 스킵

### EntryModal (항목 추가/수정)
- **목표 타입 지원**: goal-yearly/goal-monthly 유형 추가 (연간/월간 토글)
- 목표 타입 선택 시 날짜/시간/반복 필드 자동 조정
- **삭제 버튼**: 수정 모드에서 하단에 삭제 버튼 표시 (confirm 후 삭제)
- 반복 설정 (매일/매주/매월)
- **다일간 항목**: 종료일(`endDate`)이 시작일과 다르면 시간 필드 자동 숨김
  - "다일간 항목은 시간 설정이 적용되지 않습니다" 안내 배너 표시
  - 저장 시 `time`, `endTime`을 `undefined`로 처리
- **클리어 버튼** (`✕`): 종료일, 시작시간, 종료시간 필드에 개별 클리어 버튼 제공

### Gantt Chart
- 주간/월간/분기 범위 전환
- **날짜 헤더 sticky 고정**: 스크롤해도 상단에 날짜가 항상 보임
- **유형 심볼 표시**: 라벨 앞에 ·할일, ○일정, ◎목표 등 표시
- **최소 바 너비**: 단일 날짜 항목도 최소 28px 보장
- 이관/취소 숨김 토글
- 바 클릭 시 수정 모달 열림

## File Structure (주요)
```
BulletJournalApp/
  api/notion.js           <- Vercel serverless (실제 배포됨)
  index.html              <- 글로벌 CSS, PWA 설정
  src/
    App.tsx               <- 라우팅, 상태관리, DarkModeProvider, 태그바, 마이그레이션
    main.tsx              <- 엔트리포인트
    firebase/
      config.ts           <- Firebase 초기화 (bulletjournal-5a9d6)
    hooks/
      useAuth.ts          <- Firebase Google Auth
      useFirestoreSync.ts <- Firestore 실시간 동기화 (entries 단일 컬렉션)
      useDarkModeContext.tsx <- DarkModeProvider + useTheme() + statusColor()
      useEntries.ts       <- entries CRUD
      useGoals.ts         <- (미사용, Goal→Entry 마이그레이션 완료)
      useNotifications.ts <- 시간 기반 브라우저 알림
      useNotionSync.ts    <- (미사용, Notion 연동 제거됨)
    screens/
      AllScreen.tsx       <- 전체 뷰 (미완료/전체 토글, 날짜별 그루핑)
      DailyScreen.tsx     <- 목록/시간표 뷰, 터치+마우스 드래그, 자동스크롤, 마감임박
      WeeklyScreen.tsx    <- 주간 뷰 (compact EntryRow + 스와이프)
      MonthlyScreen.tsx   <- 월간 뷰 (미니캘린더 + 할일 + 월간목표)
      AnnualScreen.tsx    <- 연간 뷰 (연간목표 + 월별 요약 그리드)
      GanttScreen.tsx     <- 간트차트 (sticky 헤더, 유형 심볼, 최소 바 너비)
      NotesScreen.tsx
      StatsScreen.tsx     <- 통계 (도넛차트, 주간완료율, 월별트렌드, 목표달성률)
      SettingsScreen.tsx  <- 설정, 백업/복원, 공유 백업, Google 로그인, 알림 토글
    components/
      Header.tsx          <- 헤더 + 동기화 상태 점 표시
      EntryRow.tsx        <- 스와이프 (compact/full, 터치+마우스+우클릭)
      EntryModal.tsx      <- 항목 추가/수정 (목표 타입, 삭제 버튼, 반복, 클리어버튼)
      DailySummary.tsx    <- 미니 도넛차트 위젯
      SearchModal.tsx
      MigrateModal.tsx
      DeleteConfirm.tsx
    utils/
      constants.ts        <- COLORS, COLORS_DARK, STATUS, STATUS_DARK, TYPES, PRIORITY
      date.ts
      storage.ts          <- localStorage CRUD + autoBackup + 백업알림 + 공유백업 + Goal 마이그레이션
      firestore.ts        <- Firestore CRUD 헬퍼
      notion.ts           <- (미사용, Notion API 제거됨)
      recurring.ts        <- 반복 항목 생성
      quotes.ts           <- 500개 명언 (인간관계/성실/역경)
    styles/
      theme.ts            <- getStyles(isDark) - 모든 스타일 정의
    types/
      index.ts            <- Entry, EntryType(goal 포함), Goal(레거시), ViewType 등
api/notion.js             <- 루트 레벨 (Vercel에서 사용 안됨, BulletJournalApp/api가 실제)
vercel.json               <- 루트 Vercel 설정
```

## Features
- 전체/일간/주간/월간/연간/간트/메모/통계 8개 뷰
- 상태 순환 (할일→진행→완료→취소)
- 우선순위 (없음/중요/긴급) - 스와이프로 변경
- 태그 필터링 (2줄 접기/펼치기)
- 마감일 D-day 표시 + 마감 임박 섹션 (D-3 이내)
- 반복 항목 (매일/매주/매월)
- 다일간 항목 지원 (종료일 설정, 시간 자동 숨김)
- 목표 관리 (연간/월간) - Entry로 통합, 태그/메모/스와이프 지원
- Firebase Firestore 클라우드 동기화 (Google 로그인)
- 오프라인 삭제 추적 + 재연결 동기화 + 삭제 부활 방지
- 동기화 상태 표시 (초록/주황/빨강 점)
- 시간 기반 브라우저 알림 (앱 열림 시, 설정에서 on/off)
- 자동 백업 (1시간마다)
- 백업 알림 배너 (3일 경과 시 자동 표시)
- 공유 백업 (iOS Share API)
- 다크모드 (시스템/라이트/다크) + STATUS_DARK 전용 색상
- 시간표 드래그앤드롭 (터치 + 마우스, 자동스크롤)
- PC 지원 (마우스 스와이프, 우클릭 수정, 타임라인 마우스 드래그)
- 검색
- 데이터 내보내기/가져오기
- 명언 표시 (500개, 일별 순환)
- 수정 모달에서 삭제 가능

## Common Pitfalls
1. Vercel serverless는 `BulletJournalApp/api/`에 있어야 함 (루트 `api/` 아님)
2. Vercel serverless는 CommonJS (`module.exports`) 사용 (ESM `export default` 안됨)
3. Notion 동기화는 제거됨 (관련 코드는 남아있으나 미사용)
4. `position: sticky`는 iOS PWA standalone 모드에서 안됨 → flex layout 사용
5. iOS에서 버튼 onClick이 부모 touch handler에 의해 씹힐 수 있음 → onTouchEnd + stopPropagation
6. 다크모드 스타일은 반드시 `useTheme()` 훅 사용 (정적 import 금지). 색상 하드코딩 금지 → `C.textPrimary`, `C.border` 등 테마 변수 사용. 상태 색상은 `statusColor()` 사용
7. Firestore 동기화는 `updatedAt` 기준 last-write-wins → 항목 수정 시 `updatedAt` 반드시 갱신
8. Firestore `setDoc` 시 `undefined` 값 제거 필수 → `stripUndefined()` 사용 (config에 `ignoreUndefinedProperties`도 설정됨)
9. 버튼 focus outline은 `index.html` 글로벌 CSS로 제거됨 (`button:focus, button:active { outline: none }`)
10. 타임라인 드래그 시 `non-passive` 터치 리스너 필요 (`{ passive: false }`) → `preventDefault` 호출을 위해
11. 타임라인 자동스크롤은 뷰포트 기준 60px 영역 → 스크롤러 rect가 아닌 `window.innerHeight` 사용
12. Goal은 Entry로 통합됨 → `useGoals` 사용 금지, entries에서 `type === 'goal-yearly'/'goal-monthly'`로 필터
13. 삭제 시 `trackDeletedEntry()` + `setEntries` 순서 중요 → localStorage 먼저 기록해야 onSnapshot 부활 방지
14. FAB(+) 버튼은 화면 중앙 하단 (`left: 50%, transform: translateX(-50%)`) — 스와이프 메뉴와 겹침 방지
