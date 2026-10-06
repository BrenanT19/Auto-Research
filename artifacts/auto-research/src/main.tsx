import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
const landingPage = new URL(import.meta.env.BASE_URL, window.location.origin);
const isNonLandingUrl = window.location.pathname !== landingPage.pathname ||
  Boolean(window.location.search || window.location.hash);

if (navigation?.type === 'reload' && isNonLandingUrl) {
  window.location.replace(landingPage.href);
} else {
  createRoot(document.getElementById('root')!, {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}
