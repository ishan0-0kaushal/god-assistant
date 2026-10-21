import React from 'react';

// Flat silhouettes for the weight ladder. Origin is the bottom centre, so each
// one sits on the scale pan at y=0.

const INK = '#0b1020';
const SW = 5;

export const Elephant: React.FC = () => (
	<g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
		<rect x={-92} y={-62} width={30} height={62} rx={8} fill="#8e97ab" />
		<rect x={-40} y={-62} width={30} height={62} rx={8} fill="#8e97ab" />
		<rect x={22} y={-62} width={30} height={62} rx={8} fill="#8e97ab" />
		<rect x={64} y={-62} width={30} height={62} rx={8} fill="#8e97ab" />
		<ellipse cx={0} cy={-112} rx={112} ry={70} fill="#a3acbf" />
		<path d="M-108,-118 q-26,10 -18,42" fill="none" strokeLinecap="round" />
		<circle cx={104} cy={-150} r={52} fill="#a3acbf" />
		<path d="M140,-130 C176,-110 170,-56 150,-30 C146,-24 136,-26 138,-34 C152,-62 150,-98 124,-112 Z" fill="#a3acbf" />
		<path d="M70,-196 C30,-210 20,-130 66,-110 C80,-106 88,-140 70,-196 Z" fill="#8e97ab" />
		<circle cx={120} cy={-164} r={6} fill={INK} stroke="none" />
		<path d="M128,-128 q18,8 30,0" fill="none" stroke="#f4efe1" strokeWidth={8} strokeLinecap="round" />
	</g>
);

export const Jet: React.FC = () => (
	<g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
		<path d="M-40,-64 L-110,-20 L-80,-14 L-10,-50 Z" fill="#c9d3e3" />
		<path d="M-150,-70 C-150,-100 -120,-104 -90,-104 L140,-104 C176,-104 196,-86 196,-70 C196,-54 176,-40 140,-40 L-120,-40 C-140,-40 -150,-52 -150,-70 Z" fill="#eef2f8" />
		<path d="M-150,-70 L-176,-150 L-140,-150 L-104,-100" fill="#eef2f8" />
		<path d="M-120,-62 L160,-62" stroke="#2f6fd6" strokeWidth={8} />
		<path d="M20,-58 L-50,0 L-14,0 L64,-50 Z" fill="#c9d3e3" />
		{[-60, -30, 0, 30, 60, 90, 120].map((x) => (
			<circle key={x} cx={x} cy={-80} r={5} fill="#2f6fd6" stroke="none" />
		))}
		<path d="M168,-84 L186,-84" stroke={INK} strokeWidth={6} strokeLinecap="round" />
	</g>
);

export const Eiffel: React.FC = () => (
	<g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
		<path
			d="M-110,0 C-70,-40 -40,-110 -26,-200 L-14,-300 L-6,-360 L6,-360 L14,-300 L26,-200 C40,-110 70,-40 110,0 L60,0 C40,-50 -40,-50 -60,0 Z"
			fill="#c8955a"
		/>
		<path d="M-72,-80 L72,-80" strokeWidth={10} />
		<path d="M-36,-200 L36,-200" strokeWidth={9} />
		<path d="M-18,-300 L18,-300" strokeWidth={8} />
		<path d="M0,-360 L0,-392" strokeWidth={5} />
	</g>
);

export const Titanic: React.FC = () => (
	<g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
		{[-90, -36, 18, 72].map((x) => (
			<g key={x}>
				<rect x={x} y={-176} width={30} height={84} fill="#f2a516" />
				<rect x={x} y={-176} width={30} height={18} fill="#1a1f2e" />
			</g>
		))}
		<rect x={-150} y={-100} width={290} height={34} fill="#f4f1ea" />
		<path d="M-200,-70 L210,-70 L180,0 L-170,0 Z" fill="#1a1f2e" />
		<path d="M-188,-24 L196,-24 L180,0 L-170,0 Z" fill="#b5302f" />
		{[-130, -100, -70, -40, -10, 20, 50, 80, 110].map((x) => (
			<circle key={x} cx={x} cy={-48} r={4} fill="#f4f1ea" stroke="none" />
		))}
	</g>
);

export const EmpireState: React.FC = () => (
	<g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
		<rect x={-80} y={-150} width={160} height={150} fill="#aab4c4" />
		<rect x={-62} y={-250} width={124} height={100} fill="#b9c2d0" />
		<rect x={-44} y={-330} width={88} height={80} fill="#c6cedb" />
		<rect x={-26} y={-372} width={52} height={42} fill="#d3dae5" />
		<path d="M-12,-372 L0,-430 L12,-372 Z" fill="#d3dae5" />
		<line x1={0} y1={-430} x2={0} y2={-470} strokeWidth={5} />
		{[-50, -20, 10, 40].map((x) => (
			<line key={x} x1={x + 6} y1={-140} x2={x + 6} y2={-10} stroke="#7d8798" strokeWidth={6} />
		))}
		{[-36, -6, 24].map((x) => (
			<line key={x} x1={x + 6} y1={-240} x2={x + 6} y2={-160} stroke="#7d8798" strokeWidth={6} />
		))}
	</g>
);

export const Pyramid: React.FC = () => (
	<g stroke={INK} strokeWidth={SW} strokeLinejoin="round">
		<path d="M-230,0 L0,-250 L230,0 Z" fill="#e4b866" />
		<path d="M0,-250 L60,0 L230,0 Z" fill="#c99a45" />
		{[50, 100, 150, 200].map((y) => {
			const half = (230 * (250 - y)) / 250;
			return <line key={y} x1={-half} y1={-(250 - y)} x2={half} y2={-(250 - y)} stroke="#a77c32" strokeWidth={4} />;
		})}
	</g>
);

export type ObjectKey = 'elephant' | 'jet' | 'eiffel' | 'titanic' | 'empire' | 'pyramid';

export const OBJECTS: Record<ObjectKey, {label: string; weight: string; el: React.FC; scale: number}> = {
	elephant: {label: 'ELEPHANT', weight: '~6 t', el: Elephant, scale: 0.95},
	jet: {label: 'LOADED A380 JET', weight: '575 t', el: Jet, scale: 0.85},
	eiffel: {label: 'EIFFEL TOWER', weight: '10,100 t', el: Eiffel, scale: 0.72},
	titanic: {label: 'TITANIC', weight: '~53,000 t', el: Titanic, scale: 0.78},
	empire: {label: 'EMPIRE STATE BLDG', weight: '~331,000 t', el: EmpireState, scale: 0.6},
	pyramid: {label: 'GREAT PYRAMID', weight: '~5.9 million t', el: Pyramid, scale: 0.68},
};
