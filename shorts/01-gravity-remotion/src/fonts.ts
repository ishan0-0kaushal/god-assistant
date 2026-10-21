import {useState} from 'react';
import {continueRender, delayRender} from 'remotion';

// Hold the render until the bundled fonts are ready so no frame uses a fallback.
export const useFonts = () => {
	const [handle] = useState(() => {
		const h = delayRender('Loading fonts');
		Promise.all([
			document.fonts.load('80px Anton'),
			document.fonts.load('800 30px Inter'),
			document.fonts.load('900 30px Inter'),
		]).then(() => continueRender(h));
		return h;
	});
	return handle;
};
