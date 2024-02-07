import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import 'ag-grid-community/styles/ag-grid.css'; // Core CSS
import 'ag-grid-community/styles/ag-theme-quartz.css'; // Theme

import './core/translations/i18n';

import 'swiper/css';
import 'swiper/css/pagination';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
