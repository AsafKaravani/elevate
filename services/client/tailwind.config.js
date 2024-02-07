/** @type {import('tailwindcss').Config} */

import tailwindSafelistGenerator from 'tailwind-safelist-generator';

export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './safelist.txt'],
	theme: {
		extend: {
			colors: {
				'primary-color': 'var(--primary-color)',
				'secondary-color': 'var(--secondary-color)'
			}
		}
	},
	plugins: [tailwindSafelistGenerator({
		path: 'safelist.txt',
		patterns: [
			'bg-{colors}',
			'col-start-{gridColumnStart}',
			'row-start-{gridRowStart}',
			'col-{gridColumn}',
			'row-{gridRow}'
		]
	})],
	important: true
};
