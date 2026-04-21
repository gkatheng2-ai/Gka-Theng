import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Buffer } from 'buffer';

// Fix for simple-peer 'global is not defined' error in browser
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
(window as any).Buffer = Buffer;
(window as any).process = { env: {}, nextTick: (cb: any) => setTimeout(cb, 0) };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
