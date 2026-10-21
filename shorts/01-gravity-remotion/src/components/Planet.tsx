import React from 'react';
import {interpolate} from 'remotion';

export const PLANET_CX = 540;
export const PLANET_CY = 720;
const EARTH_R = 300;
const HOLE_R = 70;

const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

type Props = {
	// 0 = Earth, 1 = black hole.
	collapse: number;
	// How close escape speed is to light speed, 0..1.
	lightFill: number;
	// Atmosphere thickness in px.
	atmo: number;
	// Loop phase 0..1 over the whole video, for idle motion that matches at the seam.
	phase: number;
};

export const Planet: React.FC<Props> = ({collapse, lightFill, atmo, phase}) => {
	const r = interpolate(collapse, [0, 1], [EARTH_R, HOLE_R]);
	const dark = smooth(0.25, 0.85, collapse);
	const ring = smooth(0.55, 1, collapse);
	const spin = phase * 360 * 6;

	const rays = Array.from({length: 12}, (_, i) => {
		const a = (i / 12) * Math.PI * 2 + 0.2;
		const n = {x: Math.cos(a), y: Math.sin(a)};
		const s = {x: PLANET_CX + n.x * r, y: PLANET_CY + n.y * r};
		const far = 520;
		const k = smooth(0.62, 1, lightFill);
		const land = a + 0.45;
		const e = {
			x: interpolate(k, [0, 1], [s.x + n.x * far, PLANET_CX + Math.cos(land) * r]),
			y: interpolate(k, [0, 1], [s.y + n.y * far, PLANET_CY + Math.sin(land) * r]),
		};
		const apex = a + 0.22 * k;
		const c = {
			x: interpolate(k, [0, 1], [s.x + n.x * far * 0.5, PLANET_CX + Math.cos(apex) * (r + 260)]),
			y: interpolate(k, [0, 1], [s.y + n.y * far * 0.5, PLANET_CY + Math.sin(apex) * (r + 260)]),
		};
		return {d: `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`, i};
	});

	const rayOpacity = (1 - ring) * smooth(0, 0.08, lightFill + 0.08);

	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<defs>
				<radialGradient id="ocean" cx="40%" cy="35%" r="70%">
					<stop offset="0%" stopColor="#3d8fe0" />
					<stop offset="100%" stopColor="#123766" />
				</radialGradient>
				<radialGradient id="glow" cx="50%" cy="50%" r="50%">
					<stop offset="60%" stopColor="rgba(255,170,60,0)" />
					<stop offset="80%" stopColor="rgba(255,170,60,0.55)" />
					<stop offset="100%" stopColor="rgba(255,170,60,0)" />
				</radialGradient>
				<linearGradient id="disk" x1="0" x2="1">
					<stop offset="0%" stopColor="#ff6a00" />
					<stop offset="50%" stopColor="#fff2c4" />
					<stop offset="100%" stopColor="#ff6a00" />
				</linearGradient>
				<clipPath id="earthClip">
					<circle cx={PLANET_CX} cy={PLANET_CY} r={r} />
				</clipPath>
			</defs>

			{/* Light trying to leave */}
			<g opacity={rayOpacity} fill="none" stroke="#fff6c9" strokeWidth={6} strokeLinecap="round">
				{rays.map(({d, i}) => (
					<path
						key={i}
						d={d}
						strokeDasharray="28 26"
						strokeDashoffset={-phase * 900 * 4}
						style={{filter: 'drop-shadow(0 0 8px rgba(255,240,180,0.9))'}}
					/>
				))}
			</g>

			{/* Accretion disk, back half */}
			<g opacity={ring}>
				<ellipse
					cx={PLANET_CX}
					cy={PLANET_CY}
					rx={250}
					ry={56}
					fill="none"
					stroke="url(#disk)"
					strokeWidth={22}
					strokeDasharray="60 18"
					strokeDashoffset={spin}
					style={{filter: 'drop-shadow(0 0 22px rgba(255,140,40,0.9))'}}
				/>
				<circle cx={PLANET_CX} cy={PLANET_CY} r={HOLE_R + 70} fill="url(#glow)" />
			</g>

			{/* Atmosphere */}
			<circle
				cx={PLANET_CX}
				cy={PLANET_CY}
				r={r + atmo / 2}
				fill="none"
				stroke="rgba(91,224,255,0.55)"
				strokeWidth={Math.max(2, atmo)}
				opacity={1 - dark}
			/>

			{/* Earth body */}
			<circle cx={PLANET_CX} cy={PLANET_CY} r={r} fill="url(#ocean)" stroke="#0b1020" strokeWidth={6} />
			<g clipPath="url(#earthClip)" opacity={1 - dark}>
				<g transform={`translate(${PLANET_CX},${PLANET_CY}) scale(${r / EARTH_R})`}>
					<path d="M-210,-150 C-160,-220 -40,-200 -30,-130 C-20,-60 -110,-40 -140,10 C-170,60 -250,20 -240,-60 Z" fill="#3fa36b" />
					<path d="M30,-60 C90,-120 200,-90 220,-20 C240,50 170,80 120,140 C80,190 30,150 40,90 C50,40 -10,10 30,-60 Z" fill="#3fa36b" />
					<path d="M-120,150 C-80,120 -20,150 -40,210 C-60,260 -150,250 -150,200 Z" fill="#3fa36b" />
					<ellipse cx={-60} cy={-250} rx={120} ry={40} fill="#e8f4ff" />
				</g>
			</g>
			<circle cx={PLANET_CX} cy={PLANET_CY} r={r} fill="#000" opacity={dark} />

			{/* Photon ring + front half of the disk */}
			<g opacity={ring}>
				<circle
					cx={PLANET_CX}
					cy={PLANET_CY}
					r={HOLE_R + 14}
					fill="none"
					stroke="#ffe7b0"
					strokeWidth={8}
					style={{filter: 'drop-shadow(0 0 18px rgba(255,200,120,1))'}}
				/>
				<circle cx={PLANET_CX} cy={PLANET_CY} r={HOLE_R} fill="#000" />
				<path
					d={`M${PLANET_CX - 250},${PLANET_CY} A250,56 0 0,0 ${PLANET_CX + 250},${PLANET_CY}`}
					fill="none"
					stroke="url(#disk)"
					strokeWidth={22}
					strokeDasharray="60 18"
					strokeDashoffset={spin}
					style={{filter: 'drop-shadow(0 0 22px rgba(255,140,40,0.9))'}}
				/>
			</g>
		</svg>
	);
};
