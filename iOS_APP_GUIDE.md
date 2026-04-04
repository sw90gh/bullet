# Bullet Journal iOS 앱 출시 가이드

## 목차
1. [현재 상태 분석](#1-현재-상태-분석)
2. [iOS 앱 전환 방법 비교](#2-ios-앱-전환-방법-비교)
3. [추천 전환 경로: Capacitor](#3-추천-전환-경로-capacitor)
4. [전환 전 개선 필요 사항](#4-전환-전-개선-필요-사항)
5. [Capacitor 전환 단계별 가이드](#5-capacitor-전환-단계별-가이드)
6. [PC/폰 연동 (크로스 플랫폼)](#6-pc폰-연동-크로스-플랫폼)
7. [서버/인프라 비용](#7-서버인프라-비용)
8. [App Store 출시 절차](#8-app-store-출시-절차)
9. [GitHub/Vercel 관리 구조](#9-githubvercel-관리-구조)
10. [배포 파이프라인](#10-배포-파이프라인)
11. [수익화 옵션](#11-수익화-옵션)

---

## 1. 현재 상태 분석

### 기술 스택
| 항목 | 현재 |
|------|------|
| 프레임워크 | React 18.3 + TypeScript 5.6 |
| 빌드 도구 | Vite 6.0 |
| 백엔드 | Firebase (Auth, Firestore, Storage) |
| 배포 | Vercel (자동 배포) |
| 모바일 | PWA (vite-plugin-pwa + Workbox) |
| 네이티브 | 없음 (순수 웹앱) |

### PWA vs 네이티브 앱 차이
| 기능 | PWA (현재) | 네이티브 앱 |
|------|-----------|-----------|
| App Store 배포 | X | O |
| 푸시 알림 | 제한적 (iOS 16.4+, 홈화면 추가 시) | 완전 지원 |
| 백그라운드 동기화 | X | O |
| 위젯 | X | O |
| Siri/단축어 연동 | X | O |
| 성능 | 좋음 | 더 좋음 |
| 앱 아이콘 뱃지 | X | O |
| 오프라인 | Service Worker 기반 | 네이티브 캐시 |

---

## 2. iOS 앱 전환 방법 비교

### 방법 A: Capacitor (추천)
기존 React 코드를 거의 그대로 사용하면서 네이티브 쉘로 감싸는 방식.

| 장점 | 단점 |
|------|------|
| 기존 코드 90%+ 재사용 | WebView 기반 (완전 네이티브 아님) |
| 전환 기간 1~2주 | 일부 네이티브 기능 플러그인 필요 |
| 웹/앱 동시 유지 가능 | 고성능 애니메이션에 한계 |
| 플러그인 생태계 풍부 | |

### 방법 B: React Native 재작성
완전히 새로운 코드베이스로 재작성.

| 장점 | 단점 |
|------|------|
| 네이티브 성능 | 전체 재작성 필요 (2~3개월) |
| 네이티브 UI 컴포넌트 | 웹 코드 재사용 불가 |
| 큰 커뮤니티 | 별도 유지보수 |

### 방법 C: Flutter 재작성
Dart 언어로 완전 재작성.

| 장점 | 단점 |
|------|------|
| iOS + Android 동시 | 완전 재작성 + 새 언어 |
| 우수한 성능 | Firebase 연동 추가 작업 |
| Google 지원 | 웹 코드 재사용 불가 |

### 방법 D: Swift (네이티브) 재작성
Apple 공식 기술로 재작성.

| 장점 | 단점 |
|------|------|
| 최고 성능/UX | iOS만 가능 |
| Apple 생태계 완전 통합 | 완전 재작성 (3~4개월) |
| SwiftUI 모던 UI | 웹 버전 별도 유지 |

### 결론: **Capacitor 추천**
- 기존 React 코드를 그대로 사용
- 웹(Vercel) + iOS 앱 동시 운영 가능
- 가장 빠른 전환 (1~2주)
- 나중에 필요하면 점진적으로 네이티브 기능 추가 가능

---

## 3. 추천 전환 경로: Capacitor

### Capacitor란?
Ionic 팀이 만든 하이브리드 앱 프레임워크. React/Vue/Angular 웹앱을 iOS/Android 네이티브 앱으로 패키징.

### 아키텍처
```
┌─────────────────────────────┐
│  App Store / TestFlight     │
└─────────┬───────────────────┘
          │
┌─────────▼───────────────────┐
│  iOS Native Shell (Swift)   │  ← Capacitor가 자동 생성
│  ┌───────────────────────┐  │
│  │  WKWebView            │  │  ← 기존 React 앱이 여기서 실행
│  │  ┌─────────────────┐  │  │
│  │  │ React + Vite    │  │  │
│  │  │ (기존 코드)      │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
│  Capacitor Plugins          │  ← 네이티브 기능 브릿지
│  (Push, Haptics, etc.)      │
└─────────────────────────────┘
```

### 추가되는 네이티브 기능
- **푸시 알림**: `@capacitor/push-notifications` → 앱 닫혀있어도 알림
- **로컬 알림**: `@capacitor/local-notifications` → 시간 기반 알림 강화
- **햅틱 피드백**: `@capacitor/haptics` → 상태 변경 시 진동
- **상태바**: `@capacitor/status-bar` → 다크모드 연동
- **키보드**: `@capacitor/keyboard` → 입력 시 레이아웃 조정
- **앱 뱃지**: `@capacitor/badge` → 미완료 항목 수 뱃지

---

## 4. 전환 전 개선 필요 사항

### 필수 (App Store 심사 통과용)
| 항목 | 이유 | 난이도 |
|------|------|--------|
| 개인정보처리방침 | App Store 필수 | 쉬움 |
| 앱 아이콘 (1024x1024) | App Store 필수 | 쉬움 |
| 스플래시 스크린 | 로딩 화면 필요 | 쉬움 |
| 에러 처리 강화 | 크래시 방지 | 중간 |
| 오프라인 모드 안정화 | 네트워크 없이 동작 보장 | 중간 |

### 권장 (UX 품질용)
| 항목 | 이유 | 난이도 |
|------|------|--------|
| Safe Area 완벽 대응 | 노치/다이나믹 아일랜드 | 쉬움 |
| 키보드 회피 로직 | 입력 시 화면 가림 방지 | 중간 |
| 앱 상태 복원 | 백그라운드 → 포그라운드 | 중간 |
| 성능 최적화 | 대량 데이터 시 버벅임 방지 | 중간 |
| 다국어 지원 | 한국어 외 영어 등 | 중간 |

### 선택 (차별화용)
| 항목 | 이유 | 난이도 |
|------|------|--------|
| iOS 위젯 | 홈화면 위젯 | 어려움 (Swift 필요) |
| Apple Watch 연동 | 빠른 입력 | 어려움 |
| Siri 단축어 | 음성으로 항목 추가 | 중간 |
| iCloud 동기화 | Apple 생태계 연동 | 중간 |

---

## 5. Capacitor 전환 단계별 가이드

### Step 1: Capacitor 설치 (10분)
```bash
cd BulletJournalApp
npm install @capacitor/core @capacitor/cli
npx cap init "Bullet Journal" "com.yourname.bulletjournal"
```

### Step 2: iOS 플랫폼 추가 (5분)
```bash
npm install @capacitor/ios
npx cap add ios
```

### Step 3: 빌드 & 동기화 (2분)
```bash
npm run build        # Vite 빌드
npx cap sync ios     # 빌드 결과를 iOS 프로젝트에 복사
```

### Step 4: Xcode에서 실행 (5분)
```bash
npx cap open ios     # Xcode 프로젝트 열기
```
Xcode에서 시뮬레이터 또는 실기기로 테스트.

### Step 5: 네이티브 플러그인 추가 (선택)
```bash
npm install @capacitor/push-notifications
npm install @capacitor/local-notifications
npm install @capacitor/haptics
npm install @capacitor/status-bar
npx cap sync ios
```

### Step 6: 코드 조정
```typescript
// 플랫폼 감지
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // 네이티브 앱에서만 실행되는 코드
  // 예: 푸시 알림 등록, 상태바 설정 등
}
```

### 프로젝트 구조 변화
```
BulletJournalApp/
  ios/                    ← 새로 생성 (Capacitor)
    App/
      App/
        Info.plist
        AppDelegate.swift
      Podfile
  src/                    ← 기존 코드 (변경 최소)
  capacitor.config.ts     ← 새로 생성
  ...
```

---

## 6. PC/폰 연동 (크로스 플랫폼)

### 현재 동기화 구조
```
[iPhone PWA] ←→ [Firebase Firestore] ←→ [PC 브라우저]
                      ↕
              [iOS 네이티브 앱]  ← Capacitor로 추가
```

### 연동 시나리오
| 시나리오 | 동작 |
|---------|------|
| PC에서 추가 → 폰 | Firestore `onSnapshot` 실시간 반영 (이미 구현됨) |
| 폰에서 추가 → PC | 동일 |
| 오프라인 폰 → 온라인 | Firestore 오프라인 캐시 → 자동 동기화 |
| 웹 + 앱 동시 사용 | Google 로그인 동일 계정이면 자동 동기화 |

### 추가 고려사항
- **동일 Firebase 프로젝트** 사용 → 웹/앱 모두 같은 DB
- **Google 로그인**: 웹은 `signInWithPopup`, 앱은 `@capacitor-firebase/authentication` 사용
- **충돌 방지**: 이미 `updatedAt` 기준 last-write-wins 구현됨

---

## 7. 서버/인프라 비용

### Firebase 무료 티어 (Spark Plan)
| 서비스 | 무료 한도 | 예상 사용량 (개인) |
|--------|----------|------------------|
| Firestore 읽기 | 50,000/일 | ~1,000/일 ✅ |
| Firestore 쓰기 | 20,000/일 | ~200/일 ✅ |
| Firestore 저장 | 1GB | ~10MB ✅ |
| Auth 사용자 | 무제한 | 1명 ✅ |
| Storage | 5GB | ~100MB ✅ |
| **월 비용** | **$0** | |

### Firebase 유료 티어 (Blaze Plan) - 사용자 증가 시
| 사용자 수 | 예상 월 비용 |
|-----------|-------------|
| ~100명 | $0~$5 |
| ~1,000명 | $5~$20 |
| ~10,000명 | $20~$100 |
| ~100,000명 | $100~$500 |

### Vercel 비용 (웹 버전 유지 시)
| 플랜 | 비용 | 특징 |
|------|------|------|
| Hobby (현재) | $0 | 개인 프로젝트, 상업용 불가 |
| Pro | $20/월 | 상업용 가능, 팀 기능 |
| Enterprise | 맞춤 | 대규모 트래픽 |

### Apple Developer Program
| 항목 | 비용 |
|------|------|
| 연간 멤버십 | $99/년 (약 13만원) |
| App Store 수수료 | 매출의 15~30% |

### 총 비용 예상 (개인 사용)
| 항목 | 월 비용 |
|------|---------|
| Firebase | $0 |
| Vercel | $0 |
| Apple Developer | ~$8.25 (연간 $99) |
| **합계** | **~$8.25/월** |

### 총 비용 예상 (소규모 출시, ~1000 사용자)
| 항목 | 월 비용 |
|------|---------|
| Firebase Blaze | ~$10 |
| Vercel Pro | $20 |
| Apple Developer | ~$8.25 |
| **합계** | **~$38/월** |

---

## 8. App Store 출시 절차

### 준비물
1. **Mac** (Xcode 필수 — Windows에서 iOS 빌드 불가)
2. **Apple Developer Account** ($99/년)
3. **iPhone** (실기기 테스트용)
4. **앱 아이콘** (1024x1024px)
5. **스크린샷** (6.7인치, 6.5인치, 5.5인치 각 최소 1장)
6. **개인정보처리방침 URL**
7. **앱 설명 텍스트** (한국어 + 영어)

### 출시 단계
```
1. Apple Developer 가입
   └→ developer.apple.com ($99/년)

2. 인증서 & 프로비저닝 프로파일 생성
   └→ Xcode → Automatically manage signing

3. App Store Connect에서 앱 등록
   └→ appstoreconnect.apple.com
   └→ 앱 이름, 번들 ID, 카테고리(생산성), 설명, 스크린샷

4. TestFlight 베타 테스트 (선택)
   └→ Xcode → Archive → Upload to App Store Connect
   └→ 내부 테스터 최대 25명, 외부 테스터 최대 10,000명

5. App Store 심사 제출
   └→ 심사 기간: 1~3일 (보통 24시간 내)
   └→ 반려 시 사유 확인 후 수정 → 재제출

6. 출시
   └→ 즉시 출시 또는 날짜 지정 출시
```

### 심사 주요 반려 사유 (미리 대비)
| 사유 | 대비 |
|------|------|
| 단순 웹사이트 래핑 | 네이티브 기능 1개 이상 추가 (푸시 알림 등) |
| 개인정보처리방침 없음 | Firebase Auth 사용 → 필수 |
| 크래시 | 오프라인/에러 처리 강화 |
| 최소 기능 부족 | 현재 기능이면 충분 |
| 저작권 문제 | 명언 데이터 출처 확인 |

---

## 9. GitHub/Vercel 관리 구조

### 추천 저장소 구조
```
bullet/                        ← 현재 저장소
  BulletJournalApp/
    src/                       ← 공유 소스코드
    ios/                       ← Capacitor iOS 프로젝트
    android/                   ← (향후) Capacitor Android
    capacitor.config.ts
    package.json
  vercel.json                  ← 웹 배포 설정
  CLAUDE.md
```

### 브랜치 전략
```
master ─────────────────────── 안정 버전 (웹 + 앱 공통)
  ├── feature/xxx ──────────── 기능 개발
  ├── fix/xxx ──────────────── 버그 수정
  └── release/ios-1.0 ──────── iOS 출시 버전 태깅
```

### 배포 흐름
```
[코드 수정] → [git push] → [Vercel 자동 배포 (웹)]
                         → [GitHub Actions (선택)]
                              └→ npm run build
                              └→ npx cap sync ios
                              └→ Xcode Cloud / Fastlane → TestFlight
```

---

## 10. 배포 파이프라인

### 웹 (현재 — 변경 없음)
```
git push → Vercel 자동 빌드 → https://bullet-brown.vercel.app/
```

### iOS 앱 (수동)
```
npm run build → npx cap sync ios → Xcode Archive → Upload → TestFlight/App Store
```

### iOS 앱 (자동화 — Xcode Cloud)
```
git push → Xcode Cloud 감지 → 자동 빌드 → TestFlight 자동 배포
```
- Xcode Cloud: Apple 제공 무료 CI/CD (월 25시간)
- 대안: GitHub Actions + Fastlane (더 유연하지만 설정 복잡)

### iOS 앱 (자동화 — Fastlane)
```yaml
# .github/workflows/ios.yml
name: iOS Build
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npx cap sync ios
      - uses: maierj/fastlane-action@v3
        with:
          lane: beta  # TestFlight 자동 업로드
```

---

## 11. 수익화 옵션

### 무료 + 프리미엄 (추천)
| 무료 | 프리미엄 ($2.99/월 또는 $19.99/년) |
|------|------|
| 기본 할일/일정/메모 | 클라우드 동기화 |
| 로컬 저장 | 무제한 태그 |
| 다크모드 | 통계 상세 |
| 시간표 | 위젯 |
|  | 반복 항목 |
|  | 백업/복원 |

### 일회성 구매 ($4.99~$9.99)
- 모든 기능 영구 해제
- 수수료: Apple 15~30%

### 완전 무료 (비수익)
- 포트폴리오/개인 사용 목적
- Firebase 무료 티어 내에서 운영

---

## 요약: 최소 비용 출시 로드맵

```
Phase 1 (1~2일): 준비
├── Apple Developer 가입 ($99/년)
├── 앱 아이콘/스크린샷 제작
└── 개인정보처리방침 페이지 작성

Phase 2 (3~5일): Capacitor 전환
├── Capacitor 설치 & iOS 프로젝트 생성
├── 네이티브 플러그인 추가 (푸시 알림, 상태바)
├── Google 로그인 네이티브 연동
└── 실기기 테스트

Phase 3 (1~2일): 심사 & 출시
├── TestFlight 베타 테스트
├── App Store 심사 제출
└── 출시

총 예상 기간: 1~2주
총 예상 비용: $99/년 (Apple Developer) + $0 (Firebase 무료)
```
