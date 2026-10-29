import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Reset, variáveis de cor/tamanho e a estrutura do menu lateral
import './tema.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
