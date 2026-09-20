import { hydrateRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App.jsx';

hydrateRoot(document.getElementById('root'), <StrictMode><App path={document.body.dataset.route} /></StrictMode>);
