import '@fontsource/anton/400.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import React from 'react';
import {Composition} from 'remotion';
import {Gravity} from './Gravity';
import {DURATION_S, FPS, HEIGHT, WIDTH} from './timeline';

export const Root: React.FC = () => (
	<Composition
		id="Gravity"
		component={Gravity}
		durationInFrames={DURATION_S * FPS}
		fps={FPS}
		width={WIDTH}
		height={HEIGHT}
	/>
);
