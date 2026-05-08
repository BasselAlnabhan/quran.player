import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/styles/global.css';

const rootElement = document.getElementById('root');
// The root element is guaranteed by index.html; throw early if it's missing
// so a mis-configured HTML file surfaces immediately in development.
if (!rootElement) {
  throw new Error('Root element #root not found in document.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
