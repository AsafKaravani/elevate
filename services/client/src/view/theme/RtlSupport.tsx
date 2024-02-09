import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { useState, useEffect } from 'react';
import i18n from '../../core/translations/i18n';
import { Direction } from '@mui/material';

// Create rtl cache
const cacheRtl = createCache({
	key: 'muirtl',
	stylisPlugins: [prefixer, rtlPlugin],
});

export function RtlSupport(props) {
	const dir = useHtmlDir();
	
	useEffect(() => {
		document.dir = i18n.dir();
		document.body.dir = i18n.dir();
	}, []);

	if (dir === 'rtl') {
		return <CacheProvider value={cacheRtl}>{props.children}</CacheProvider>;
	} else {
		return <>{props.children}</>;
	}
}

export function useHtmlDir() {

	const [dir, setDir] = useState(i18n.dir() as string);

	useEffect(() => {
		// Directly target the <html> element
		const targetElement = document.documentElement;

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				// Call the callback for any attribute change
				if (mutation.type === 'attributes' && mutation.attributeName === 'dir') {
					setDir(targetElement.getAttribute('dir') || 'ltr');
				}
			});
		});

		observer.observe(targetElement, { attributes: true });

		return () => {
			observer.disconnect();
		};
	}, []);

	return dir as Direction | undefined;
}