import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset CSS global
const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0a; color: #e8e0cc; }
  input, select, textarea {
    background: #0b0b0b; border: 1px solid #222; border-radius: 5px;
    color: #e8e0cc; font-size: 12px; outline: none; padding: 7px 9px;
    width: 100%; transition: border-color .15s; font-family: inherit;
  }
  input:focus, select:focus, textarea:focus { border-color: #c9a227; }
  select option { background: #1a1a1a; }
  textarea { resize: vertical; }
  .loading { display: flex; align-items: center; justify-content: center;
    min-height: 100vh; color: #c9a227; font-size: 16px; background: #0a0a0a; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
