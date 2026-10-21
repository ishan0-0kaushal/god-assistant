import React from 'react';
import {FlatBody} from './Stickman';
import {OBJECTS, ObjectKey} from './Objects';
import {GROUND_Y} from './Surface';

const PIVOT = {x: 520, y: 860};
// The whole scale is drawn 1.2x around this ground point.
const ZOOM = 1.2;
const ORIGIN = {x: 520, y: GROUND_Y};
export const toScreen = (p: {x: number; y: number}) => ({
	x: ORIGIN.x + (p.x - ORIGIN.x) * ZOOM,
	y: ORIGIN.y + (p.y - ORIGIN.y) * ZOOM,
});
const HALF = 250;
const STRING = 110;
const INK = '#0b1020';

export type FlyingObject = {
	key: ObjectKey;
	dx: number;
	dy: number;
	rot: number;
	opacity: number;
};

// Where each pan's centre sits for a given tilt (degrees, positive = left side down).
export const scaleGeometry = (tilt: number) => {
	const a = (tilt * Math.PI) / 180;
	const left = {x: PIVOT.x - HALF * Math.cos(a), y: PIVOT.y + HALF * Math.sin(a)};
	const right = {x: PIVOT.x + HALF * Math.cos(a), y: PIVOT.y - HALF * Math.sin(a)};
	return {
		left,
		right,
		leftPan: {x: left.x, y: left.y + STRING},
		rightPan: {x: right.x, y: right.y + STRING},
	};
};

const Pan: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g>
		<line x1={x - 100} y1={y} x2={x} y2={y - STRING} stroke="#c9d3e3" strokeWidth={4} />
		<line x1={x + 100} y1={y} x2={x} y2={y - STRING} stroke="#c9d3e3" strokeWidth={4} />
		<path
			d={`M${x - 130},${y} L${x + 130},${y} Q${x + 110},${y + 30} ${x},${y + 32} Q${x - 110},${y + 30} ${x - 130},${y} Z`}
			fill="#d9a441"
			stroke={INK}
			strokeWidth={5}
		/>
	</g>
);

export const BalanceScale: React.FC<{tilt: number; object: FlyingObject | null; bodySquash: number}> = ({
	tilt,
	object,
	bodySquash,
}) => {
	const g = scaleGeometry(tilt);
	const Obj = object ? OBJECTS[object.key].el : null;
	return (
		<g transform={`translate(${ORIGIN.x},${ORIGIN.y}) scale(${ZOOM}) translate(${-ORIGIN.x},${-ORIGIN.y})`}>
			{/* Stand */}
			<path
				d={`M${PIVOT.x - 90},${GROUND_Y} L${PIVOT.x - 40},${GROUND_Y - 50} L${PIVOT.x + 40},${GROUND_Y - 50} L${PIVOT.x + 90},${GROUND_Y} Z`}
				fill="#d9a441"
				stroke={INK}
				strokeWidth={5}
			/>
			<rect x={PIVOT.x - 14} y={PIVOT.y} width={28} height={GROUND_Y - 50 - PIVOT.y} fill="#d9a441" stroke={INK} strokeWidth={5} />

			{/* Beam */}
			<line x1={g.left.x} y1={g.left.y} x2={g.right.x} y2={g.right.y} stroke={INK} strokeWidth={26} strokeLinecap="round" />
			<line x1={g.left.x} y1={g.left.y} x2={g.right.x} y2={g.right.y} stroke="#f2c14e" strokeWidth={16} strokeLinecap="round" />
			<circle cx={PIVOT.x} cy={PIVOT.y} r={20} fill="#f2c14e" stroke={INK} strokeWidth={5} />

			<Pan x={g.leftPan.x} y={g.leftPan.y} />
			<Pan x={g.rightPan.x} y={g.rightPan.y} />

			{/* Your body */}
			<g transform={`translate(${g.leftPan.x + 30},${g.leftPan.y + 2}) scale(0.85)`}>
				<FlatBody squash={bodySquash} />
			</g>

			{object && Obj ? (
				<g
					opacity={object.opacity}
					transform={`translate(${g.rightPan.x + object.dx},${g.rightPan.y + 2 + object.dy}) rotate(${object.rot}) scale(${OBJECTS[object.key].scale})`}
				>
					<Obj />
				</g>
			) : null}
		</g>
	);
};
