import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against missing matchMedia or addListener in restricted iframe sandboxes
if (typeof window !== 'undefined') {
  try {
    if (!window.matchMedia) {
      window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });
    } else {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = function(query) {
        const mql = originalMatchMedia.call(window, query);
        if (mql) {
          if (!mql.addListener) {
            mql.addListener = function(listener) {
              if (mql.addEventListener) {
                mql.addEventListener('change', listener);
              }
            };
          }
          if (!mql.removeListener) {
            mql.removeListener = function(listener) {
              if (mql.removeEventListener) {
                mql.removeEventListener('change', listener);
              }
            };
          }
        }
        return mql;
      };
    }
  } catch (e) {
    console.warn("MatchMedia polyfill failed safely:", e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

