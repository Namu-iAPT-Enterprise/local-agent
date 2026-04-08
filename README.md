# Local AI Agent - Desktop App (NAMU LA)

본 프로젝트는 외부 인터넷망과 분리된 내부망(Local Network)에서 동작하는 PC 에이전트 시스템 아키텍처 중 **사용자와 직접 맞닿는 인터페이스**를 담당하는 데스크톱 애플리케이션(NAMU LA)입니다.

VLAN 10 (WEB 운영 영역)의 단말에 설치/실행되며, 백엔드 서버들과 직접 통신하지 않고 **오직 API Gateway**를 거쳐 기능(채팅, 인증, 스토리지 관리 등)을 수행합니다.

## 🚀 프로젝트 개요 (Overview)

- **프레임워크:** Electron 41.x + React 19 + Vite + Tailwind CSS 4
- **언어:** TypeScript
- **패키저:** Electron Forge
- **주요 역할:** 데스크톱 기반의 로컬 AI 에이전트 UI/UX 제공, 실시간 채팅 스트리밍, JWT 인증 관리 및 시스템 설정 지원

## 🏗️ 아키텍처 및 통신 흐름 (Architecture)

본 클라이언트는 데스크톱 로컬 환경에서 구동되며 API Gateway를 유일한 진입점(Single Entry Point)으로 사용합니다.

```text
NAMU LA (Electron App)
    │
    ▼
API Gateway (192.168.0.10:8080 / VLAN 10)
    │
    ├──► [VLAN 10] Auth Server (인증/사용자 관리)
    ├──► [VLAN 20] Main Agent (AI 채팅/LLM 연동)
    └──► [VLAN 30] Storage & Backup (경유)
```

1. **API 호출:** 모든 외부망 통신은 `http://192.168.0.10:8080` (API Gateway)를 향합니다. (예: `src/api/chat.ts`, `src/api/auth.ts`)
2. **실시간 스트리밍:** AI 응답은 Server-Sent Events(SSE)를 통해 수신되며, 추론 과정(Thinking)과 최종 답변(Message)을 분리하여 화면에 렌더링합니다.
3. **인증 처리:** 발급받은 JWT(Access Token)는 애플리케이션 내부에 보관되며, Gateway 요청 시 HTTP Header(`Authorization: Bearer <Token>`)에 포함됩니다.

## 🔑 주요 기능 (Key Features)

### 1. AI 채팅 인터페이스 (Chat Agent)
- SSE(`text/event-stream`) 기반의 실시간 토큰(Token) 스트리밍 렌더링.
- **Thinking UI:** 추론 모델(Reasoning Model)의 "생각 과정(Chain-of-thought)"을 아코디언 UI로 제공하여 사용자가 모델의 판단 근거를 확인할 수 있도록 지원합니다.
- 마크다운(Markdown) 및 코드 신택스 하이라이팅(`react-syntax-highlighter`) 지원.

### 2. 사용자 인증 (Auth)
- JWT 기반 로그인/로그아웃 시스템.
- 네트워크 오류 및 401 Unauthorized 에러 처리를 통한 직관적인 예외 화면 제공.

### 3. 시스템 설정 및 관리 (Settings)
- `/src/pages/settings`를 통해 다양한 관리 탭(Agents, Models, Assistants, System 등)을 제공합니다.
- 다크모드/라이트모드 및 언어 설정 기능 지원.

## ⚙️ 개발 및 실행 방법 (How to Run)

Node.js 환경과 패키지 매니저(`npm`)가 필요합니다.

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 모드 실행 (Vite & Electron)
```bash
npm start
# 내부적으로 `electron-forge start` 명령어가 실행되며 데스크톱 앱이 켜집니다.
```

### 3. 빌드 및 패키징
운영체제에 맞는 설치 파일(.exe, .dmg 등)을 생성합니다.
```bash
npm run make
```

## 📁 주요 디렉토리 구조 (Directory Structure)

- `/src/api` : API Gateway와 통신하는 Fetch 로직 (auth, chat, llm client 등)
- `/src/components` : 재사용 가능한 UI 컴포넌트 (Sidebar, MarkdownRenderer, ThinkingBlock 등)
- `/src/pages` : 주요 화면 (Login, Signup) 및 `/settings` 하위의 환경 설정 뷰
- `/src/context` : 전역 상태 관리 (Language, Theme 등)
- `/src/assets` : 배경화면 이미지(wallpapers) 등 정적 리소스

## 🛡️ 개발 시 유의사항
- 타겟 사용자가 B2B/폐쇄망 관료조직이므로, 외부 네트워크를 필요로 하는 라이브러리/웹 리소스(CDN 등)의 직접적인 사용을 지양해야 합니다.
- API 통신 시 반드시 `/src/api` 내의 공통 헤더 헬퍼(`authHeaders()`)를 사용하여 인증 정보가 누락되지 않도록 주의하세요.
