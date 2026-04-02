import './index.css';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

const root = createRoot(document.getElementById('root')!);
root.render(
  createElement(LanguageProvider, null,
    createElement(ThemeProvider, null,
      createElement(App)
    )
  )
);
