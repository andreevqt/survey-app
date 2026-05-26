import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/tailwind.css';

function App() {
  return <div className="p-8 text-2xl font-bold text-indigo-600">Survey App — scaffold OK</div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
