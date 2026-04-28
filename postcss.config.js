// Tailwind CSS v4 (@tailwindcss/postcss) PostCSS plugin.
// vite.renderer.config.ts 가 이 파일을 자동 인식하여 .css 파일을 변환합니다.
// (예: src/index.css 의 `@import "tailwindcss";` 가 실제 유틸리티 CSS 로 확장됩니다.)
//
// Tailwind v4 는 별도의 tailwind.config.{js,ts} 가 필수 아님 — content 스캔이 자동입니다.
// 필요하면 src/index.css 상단에
//   @source "./**/*.{ts,tsx}";
// 를 추가하여 명시할 수 있습니다.
//
// package.json 에 "type": "module" 이 없으므로 CommonJS 문법을 사용합니다.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
