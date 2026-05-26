import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <div>Survey App — scaffold OK</div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
