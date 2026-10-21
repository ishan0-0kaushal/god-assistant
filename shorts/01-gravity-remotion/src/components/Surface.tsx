import React from 'react';
import {random} from 'remotion';

export const GROUND_Y = 1100;
const GROUND_R = 3000;
const GROUND_CX = 540;
const GROUND_CY = GROUND_Y + GROUND_R;
const INK = '#0b1020';

export const groundAt = (x: number) => GROUND_CY - Math.sqrt(GROUND_R ** 2 - (x - GROUND_CX) ** 2);

const STARS = Array.from({length: 90}, (_, i) => ({
	x: random(`sx${i}`) * 1080,
	y: random(`sy${i}`) * 1920,
	r: 1.5 + random(`sr${i}`) * 2.8,
	tw: random(`st${i}`) * Math.PI * 2,
}));

// Space backdrop shared by both scenes. `phase` runs 0..1 over the whole video.
export const Starfield: React.FC<{phase: number}> = ({phase}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		<defs>
			<linearGradient id="space" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stopColor="#05081a" />
				<stop offset="100%" stopColor="#101a44" />
			</linearGradient>
		</defs>
		<rect width={1080} height={1920} fill="url(#space)" />
		{STARS.map((s, i) => (
			<circle
				key={i}
				cx={s.x}
				cy={s.y}
				r={s.r}
				fill="#fff"
				opacity={0.35 + 0.35 * Math.sin(phase * Math.PI * 2 * 8 + s.tw)}
			/>
		))}
	</svg>
);

type MountainProps = {x: number; h: number; w: number};
const Mountain: React.FC<MountainProps> = ({x, h, w}) => {
	const base = groundAt(x) + 6;
	const snow = Math.min(h * 0.28, 60);
	return (
		<g>
			<path d={`M${x - w / 2},${base} L${x},${base - h} L${x + w / 2},${base} Z`} fill="#4b5a78" stroke={INK} strokeWidth={5} />
			<path
				d={`M${x - (w / 2) * (snow / h)},${base - h + snow} L${x},${base - h} L${x + (w / 2) * (snow / h)},${base - h + snow} Z`}
				fill="#eef4ff"
			/>
		</g>
	);
};

const Cloud: React.FC<{x: number; y: number; s: number; squash: number}> = ({x, y, s, squash}) => (
	<g transform={`translate(${x},${y}) scale(${s * (1 + (1 - squash) * 0.6)},${s * squash})`} opacity={0.92}>
		<ellipse cx={0} cy={0} rx={70} ry={34} fill="#e8f0ff" />
		<ellipse cx={-50} cy={10} rx={46} ry={26} fill="#e8f0ff" />
		<ellipse cx={52} cy={10} rx={50} ry={26} fill="#e8f0ff" />
	</g>
);

// Ground, atmosphere and horizon. `g` is the current gravity in G.
export const Ground: React.FC<{g: number}> = ({g}) => {
	const atmo = 520 / Math.sqrt(g);
	const flatten = 1 / (1 + Math.log2(Math.max(1, g)) / 2.5);
	const inner = GROUND_R / (GROUND_R + atmo);
	const cloudY = GROUND_Y - Math.max(16, Math.min(atmo * 0.75, 420));
	const cloudSquash = Math.max(0.25, Math.min(1, atmo / 260));
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<defs>
				<radialGradient id="atmo" cx={GROUND_CX} cy={GROUND_CY} r={GROUND_R + atmo} gradientUnits="userSpaceOnUse">
					<stop offset={inner} stopColor="rgba(91,224,255,0.6)" />
					<stop offset={inner + (1 - inner) * 0.35} stopColor="rgba(60,150,255,0.25)" />
					<stop offset={1} stopColor="rgba(60,150,255,0)" />
				</radialGradient>
				<linearGradient id="dirt" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#1f5a43" />
					<stop offset="35%" stopColor="#173a33" />
					<stop offset="100%" stopColor="#0d1a24" />
				</linearGradient>
			</defs>
			<circle cx={GROUND_CX} cy={GROUND_CY} r={GROUND_R + atmo} fill="url(#atmo)" />
			<Cloud x={90} y={cloudY} s={0.8} squash={cloudSquash} />
			<Cloud x={960} y={cloudY - 40 * cloudSquash} s={0.75} squash={cloudSquash} />
			<Mountain x={110} h={260 * flatten} w={300} />
			<Mountain x={250} h={180 * flatten} w={220} />
			<Mountain x={880} h={300 * flatten} w={340} />
			<Mountain x={1030} h={200 * flatten} w={240} />
			<circle cx={GROUND_CX} cy={GROUND_CY} r={GROUND_R} fill="url(#dirt)" stroke="#3fa36b" strokeWidth={10} />
		</svg>
	);
};
