import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import EncounterFactoryShell from './EncounterFactoryShell.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <EncounterFactoryShell />
    </ErrorBoundary>
  </StrictMode>,
);
