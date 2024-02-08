import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { useState, useEffect } from 'react';

// Create rtl cache
const cacheRtl = createCache({
	key: 'muirtl',
	stylisPlugins: [prefixer, rtlPlugin],
});

export function RtlSupport(props) {
	const dir = useHtmlDir();
	
	if (dir === 'rtl') {
		return <CacheProvider value={cacheRtl}>{props.children}</CacheProvider>;
	} else {
		return <>{props.children}</>;
	}
}

function useHtmlDir() {

	const [dir, setDir] = useState(document.dir);

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

	return dir;
}