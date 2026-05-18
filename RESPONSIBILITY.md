# RESPONSIBILITY — local-agent (⚠️ DEPRECATED)

이 레포는 **분할 작업 중 참고용**으로만 유지된다.

## 현 상태

- 단말 코드(Electron + React 렌더러) → `namu-localAgent-interface` 로 이관
- BFF(Next.js, 쿠키 인증, 게이트웨이 프록시, SPA 호스팅) → `namu-localAgent-interfaceServer` 로 신규 분리

## 금지 사항

- ❌ **신규 PR 금지** — 모든 신규 작업은 위 두 레포로
- ❌ **재병합 금지** — local-agent에 BFF 책임 또는 BFF에 단말 책임을 다시 합치지 말 것
- ❌ **운영 배포 금지** — 운영에서는 namu-localAgent-interfaceServer + namu-localAgent-interface 조합만 사용

## 참고: 새 모델

```
브라우저/Electron
    │
    │  same-origin /api/* (cookies)
    ▼
namu-localAgent-interfaceServer (Next.js BFF, :3000)
    │
    │  Authorization: Bearer <jwt>
    ▼
namu-localAgent-gatewayServer
    │
    ├─ namu-localAgent-securityServer (AuthN)
    ├─ namu-localAgent-roleServer (AuthZ/OPA)
    ├─ namu-localAgent-mainServer (Main Agent)
    └─ namu-localAgent-mainServer-management
```

명세서: `../아키텍처 명세서.md` (3.0) 참조.
