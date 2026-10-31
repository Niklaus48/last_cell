import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudioApp } from './StudioApp';

const container = document.getElementById('studio-root');
if (container === null) {
  throw new Error('studio root missing');
}

createRoot(container).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);
