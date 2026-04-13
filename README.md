# Local AI Agent — Desktop App (NAMU LA)

내부망(Local Network) AI 에이전트 시스템의 **사용자 인터페이스**를 담당하는 데스크톱 애플리케이션입니다.  
VLAN 10 (WEB 운영 영역)의 단말에 설치/실행되며, 백엔드 서버들과 직접 통신하지 않고 **오직 API Gateway**를 단일 진입점으로 사용합니다.

---

## 프로젝트 개요

| 항목 | 내용 |
|:---|:---|
| 프레임워크 | Electron 41.x + React 19 + Vite |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4 |
| 패키저 | Electron Forge |
| 주요 역할 | 데스크톱 기반 로컬 AI 에이전트 UI/UX, 실시간 채팅 스트리밍, JWT 인증 관리 |

---

## 아키텍처 및 통신 흐름

```
NAMU LA (Electron App)
    │  Bearer JWT (모든 요청 헤더에 포함)
    ▼
API Gateway (192.168.0.10:8080 / VLAN 10)   ← 유일한 통신 대상
    │
    ├──► [VLAN 10] Auth Server (:8081)       인증/사용자 관리
    ├──► [VLAN 20] Main Agent (:8082)        AI 채팅/LLM 연동
    └──► [VLAN 20] Management Server (:8082) 역할·파일·공지·지식 관리
```

### 초기화 흐름

```
① 로그인 (POST /api/auth/login) → Access Token + Refresh Token 수신
② 기본 UI 표시 (채팅 화면 진입)
③ GET /api/management/role/profile → permissionRoles + enabledFeatures + allowedApis 수신
④ featureKey 기반 UI 기능 활성화 (2차 업데이트)
```

③의 응답이 오기 전까지 기본 기능만 노출하며, 수신 후 역할에 맞는 기능 메뉴가 추가됩니다.

---

## 인증 처리

- JWT(Access Token)는 앱 메모리에 보관됩니다.
- 모든 요청은 `src/api/auth.ts`의 `fetchWithAuth()`를 통해 `Authorization: Bearer <Token>` 헤더를 자동 첨부합니다.
- 401 수신 시 자동으로 Refresh Token을 사용해 토큰 갱신을 시도합니다. 갱신 실패 시 로그인 화면으로 이동합니다.

> `/api/auth/refresh`는 게이트웨이에서 JWT 필터를 거치지 않는 공개 경로입니다.

---

## 주요 기능

### AI 채팅 인터페이스

- SSE(`text/event-stream`) 기반의 실시간 토큰 스트리밍 렌더링
- **Thinking UI:** 추론 모델(Reasoning Model)의 Chain-of-thought를 아코디언 UI로 제공
- 마크다운 및 코드 신택스 하이라이팅(`react-syntax-highlighter`) 지원

### 사용자 인증

- JWT 기반 로그인/로그아웃
- 네트워크 오류 및 401 에러 처리를 통한 직관적인 예외 화면 제공

### 시스템 설정 및 관리

- `src/pages/settings`를 통해 다양한 관리 탭(Agents, Models, Assistants, System 등) 제공
- 다크모드/라이트모드 및 언어 설정 지원

---

## 권한 역할 기반 UI 제어

API Gateway로부터 수신한 `enabledFeatures` 배열을 기반으로 UI를 제어합니다.  
역할명(KEEPER, HERALD 등)을 직접 알 필요 없이 `featureKey`만으로 기능을 활성화합니다.

| featureKey | 기능 |
|:---|:---|
| `CHAT_MESSAGE` | 채팅 메시지 전송 |
| `FILE_UPLOAD` | 파일 업로드 |
| `FILE_LIST` | 파일 목록 조회 |
| `KNOWLEDGE_REGISTER` | 지식 RAG 등록 |
| `KNOWLEDGE_UPDATE` | 지식 수정 |
| `KNOWLEDGE_PURGE` | 지식 삭제 |
| `NOTICE_SEND_ROLE` | 특정 역할 공지 발송 |
| `NOTICE_SEND_ALL` | 전체 공지 발송 |

---

## API 연동 목록

| 파일 | 연동 엔드포인트 | 설명 |
|:---|:---|:---|
| `src/api/auth.ts` | `POST /api/auth/login` | 로그인 |
| `src/api/auth.ts` | `POST /api/auth/logout` | 로그아웃 |
| `src/api/auth.ts` | `GET /api/auth/me` | 내 정보 조회 |
| `src/api/auth.ts` | `POST /api/auth/refresh` | 토큰 갱신 |
| `src/api/gateway.ts` | `GET /api/management/role/profile` | 전체 권한 정보 조회 (UI 초기화용) |
| `src/api/chat.ts` | `POST /api/chat/message` | 채팅 메시지 전송 |
| `src/api/chat.ts` | `GET /api/chat/stream` | SSE 스트림 연결 |

---

## 개발 및 실행 방법

### 의존성 설치

```bash
npm install
```

### 개발 모드 실행

```bash
npm start
# electron-forge start — Vite 빌드 후 데스크톱 앱 실행
```

### 빌드 및 패키징

```bash
npm run make
# 운영체제에 맞는 설치 파일(.exe, .dmg 등) 생성
```

---

## 환경 설정

API Gateway 주소는 `src/config/apiBase.ts`에서 관리합니다.

```typescript
export const API_BASE = 'http://192.168.0.10:8080';
```

---

## 프로젝트 구조

```
src/
├── api/
│   ├── auth.ts          # 인증 API (login, logout, refresh, fetchWithAuth)
│   ├── gateway.ts       # 권한 정보 조회 (fetchRolePermissions)
│   └── chat.ts          # 채팅 API
├── components/          # 재사용 UI 컴포넌트 (Sidebar, MarkdownRenderer, ThinkingBlock 등)
├── config/
│   └── apiBase.ts       # API Gateway 주소 설정
├── context/             # 전역 상태 관리 (Language, Theme 등)
├── hooks/
│   └── usePermissions.ts  # 권한 정보 fetch 및 상태 관리
├── pages/               # 주요 화면 (Login, Signup) 및 /settings 하위 뷰
└── assets/              # 배경화면 이미지 등 정적 리소스
```

---

## 개발 시 유의사항

- 타겟 사용자가 B2B/폐쇄망 환경이므로, 외부 네트워크를 필요로 하는 라이브러리/CDN의 직접 사용을 지양합니다.
- API 통신 시 반드시 `fetchWithAuth()`를 사용하여 인증 헤더가 누락되지 않도록 합니다.
- 프론트엔드에서 절대로 `X-User-Id` 헤더를 직접 설정하지 마십시오. 게이트웨이가 JWT에서 추출해 덮어씁니다.
