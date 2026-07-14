import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Polyfill BroadcastChannel to prevent "Illegal constructor" in sandboxed iframes
try {
  new BroadcastChannel('test-channel');
} catch (e) {
  window.BroadcastChannel = class MockBroadcastChannel {
    name: string;
    onmessage = null;
    onmessageerror = null;
    constructor(name: string) { this.name = name; }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  } as any;
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
