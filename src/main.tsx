import 'framework7-icons/css/framework7-icons.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import '../design/src/tokens.css';
import '../design/src/components.css';

const root = document.getElementById('root');
if (root === null) throw new Error('index.html has no #root element');

// Push only; see public/sw.js. A browser without service workers runs the app as a page.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.error('service worker registration failed', error);
  });
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
