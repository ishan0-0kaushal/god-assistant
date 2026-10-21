import React from 'react';

export type Pose = {
	// Angles in degrees measured from straight down; positive swings toward +x.
	lHip: number;
	lKnee: number;
	rHip: number;
	rKnee: number;
	lSh: number;
	lEl: number;
	rSh: number;
	rEl: number;
	// Torso lean from vertical, positive leans toward +x.
	lean: number;
};

export const POSES = {
	stand: {lHip: -8, lKnee: 0, rHip: 8, rKnee: 0, lSh: -18, lEl: -6, rSh: 18, rEl: 6, lean: 0},
	wave: {lHip: -8, lKnee: 0, rHip: 8, rKnee: 0, lSh: -18, lEl: -6, rSh: 150, rEl: 25, lean: 0},
	crouch: {lHip: -60, lKnee: 80, rHip: 60, rKnee: -80, lSh: -40, lEl: 60, rSh: 40, rEl: -60, lean: 0},
	deepCrouch: {lHip: -85, lKnee: 120, rHip: 85, rKnee: -120, lSh: -75, lEl: 85, rSh: 75, rEl: -85, lean: 0},
	shock: {lHip: -10, lKnee: 0, rHip: 10, rKnee: 0, lSh: -150, lEl: -20, rSh: 150, rEl: 20, lean: 0},
	handsOnHead: {lHip: -10, lKnee: 0, rHip: 10, rKnee: 0, lSh: -150, lEl: -120, rSh: 150, rEl: 120, lean: 0},
	point: {lHip: -10, lKnee: 0, rHip: 10, rKnee: 0, lSh: -20, lEl: -10, rSh: 95, rEl: 0, lean: 0},
	shoulders: {lHip: -80, lKnee: 80, rHip: 80, rKnee: -80, lSh: -140, lEl: -20, rSh: 140, rEl: 20, lean: 0},
	float: {lHip: -14, lKnee: 18, rHip: 10, rKnee: 22, lSh: -60, lEl: -30, rSh: 60, rEl: 30, lean: 0},
} satisfies Record<string, Pose>;

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
	const out = {} as Pose;
	for (const k of Object.keys(a) as (keyof Pose)[]) {
		out[k] = a[k] + (b[k] - a[k]) * t;
	}
	return out;
};

const THIGH = 64;
const SHIN = 64;
const TORSO = 112;
const UPPER_ARM = 56;
const FOREARM = 54;
export const HEAD_R = 42;

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (deg: number) => ({x: Math.sin(rad(deg)), y: Math.cos(rad(deg))});

export type Eyes = 'dot' | 'x' | 'wide';
export type Mouth = 'smile' | 'o' | 'flat' | 'grit' | 'none';

type Props = {
	pose: Pose;
	eyes?: Eyes;
	mouth?: Mouth;
	look?: number;
	hat?: boolean;
	ghost?: boolean;
	sweat?: number;
	color?: string;
	opacity?: number;
};

// Feet sit on y=0, x=0 is the figure's centre line.
export const Stickman: React.FC<Props> = ({
	pose,
	eyes = 'dot',
	mouth = 'smile',
	look = 0,
	hat = true,
	ghost = false,
	sweat = 0,
	color = '#ffffff',
	opacity = 1,
}) => {
	const footDrop = (hip: number, knee: number) =>
		THIGH * dir(hip).y + SHIN * dir(hip + knee).y;
	const hipY = -Math.max(footDrop(pose.lHip, pose.lKnee), footDrop(pose.rHip, pose.rKnee));
	const hip = {x: 0, y: hipY};

	const leg = (a: number, k: number) => {
		const d1 = dir(a);
		const knee = {x: hip.x + THIGH * d1.x, y: hip.y + THIGH * d1.y};
		const d2 = dir(a + k);
		const foot = {x: knee.x + SHIN * d2.x, y: knee.y + SHIN * d2.y};
		return `M${hip.x},${hip.y} L${knee.x},${knee.y} L${foot.x},${foot.y}`;
	};

	const up = {x: Math.sin(rad(pose.lean)), y: -Math.cos(rad(pose.lean))};
	const neck = {x: hip.x + TORSO * up.x, y: hip.y + TORSO * up.y};
	const shoulder = {x: hip.x + (TORSO - 8) * up.x, y: hip.y + (TORSO - 8) * up.y};
	const head = {x: neck.x + (HEAD_R + 6) * up.x, y: neck.y + (HEAD_R + 6) * up.y};

	const arm = (s: number, e: number) => {
		const d1 = dir(s + pose.lean);
		const elbow = {x: shoulder.x + UPPER_ARM * d1.x, y: shoulder.y + UPPER_ARM * d1.y};
		const d2 = dir(s + e + pose.lean);
		const hand = {x: elbow.x + FOREARM * d2.x, y: elbow.y + FOREARM * d2.y};
		return `M${shoulder.x},${shoulder.y} L${elbow.x},${elbow.y} L${hand.x},${hand.y}`;
	};

	const stroke = ghost ? '#bfeaff' : color;
	const headFill = ghost ? 'rgba(191,234,255,0.9)' : '#ffffff';
	const ink = '#0b1020';

	const eye = (side: -1 | 1) => {
		const cx = side * 14 + look * 4;
		const cy = -4;
		if (eyes === 'x') {
			return (
				<g key={side} stroke={ink} strokeWidth={4.5} strokeLinecap="round">
					<line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} />
					<line x1={cx - 6} y1={cy + 6} x2={cx + 6} y2={cy - 6} />
				</g>
			);
		}
		if (eyes === 'wide') {
			return (
				<g key={side}>
					<circle cx={cx} cy={cy} r={11} fill="#fff" stroke={ink} strokeWidth={3.5} />
					<circle cx={cx + look * 4} cy={cy} r={4.5} fill={ink} />
				</g>
			);
		}
		return <circle key={side} cx={cx} cy={cy} r={5.5} fill={ink} />;
	};

	const mouthEl = (() => {
		switch (mouth) {
			case 'smile':
				return <path d="M-13,14 Q0,26 13,14" stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />;
			case 'o':
				return <ellipse cx={0} cy={19} rx={7} ry={9} fill={ink} />;
			case 'flat':
				return <line x1={-10} y1={18} x2={10} y2={18} stroke={ink} strokeWidth={4} strokeLinecap="round" />;
			case 'grit':
				return (
					<g>
						<rect x={-14} y={11} width={28} height={13} rx={3} fill="#fff" stroke={ink} strokeWidth={3.5} />
						<line x1={-14} y1={17.5} x2={14} y2={17.5} stroke={ink} strokeWidth={2.5} />
					</g>
				);
			default:
				return null;
		}
	})();

	return (
		<g
			opacity={opacity}
			style={ghost ? {filter: 'drop-shadow(0 0 14px rgba(140,220,255,0.9))'} : undefined}
		>
			<g stroke={stroke} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none">
				<path d={leg(pose.lHip, pose.lKnee)} />
				<path d={leg(pose.rHip, pose.rKnee)} />
				<line x1={hip.x} y1={hip.y} x2={neck.x} y2={neck.y} />
				<path d={arm(pose.lSh, pose.lEl)} />
				<path d={arm(pose.rSh, pose.rEl)} />
			</g>
			<g transform={`translate(${head.x},${head.y}) rotate(${pose.lean})`}>
				{ghost ? (
					<ellipse cx={0} cy={-HEAD_R - 34} rx={30} ry={8} fill="none" stroke="#ffe066" strokeWidth={6} />
				) : null}
				<circle r={HEAD_R} fill={headFill} stroke={ink} strokeWidth={4} />
				{eye(-1)}
				{eye(1)}
				{mouthEl}
				{sweat > 0 ? (
					<path
						d="M30,-22 q8,14 0,20 q-8,-6 0,-20z"
						fill="#7fd4ff"
						opacity={sweat}
						transform={`translate(0,${(1 - sweat) * -8})`}
					/>
				) : null}
				{hat ? <Hat ghost={ghost} /> : null}
			</g>
		</g>
	);
};

export const Hat: React.FC<{ghost?: boolean}> = ({ghost}) => (
	<g transform={`translate(0,${-HEAD_R + 8})`} opacity={ghost ? 0.75 : 1}>
		<ellipse cx={0} cy={0} rx={52} ry={10} fill="#e63946" stroke="#0b1020" strokeWidth={4} />
		<path d="M-32,-2 C-32,-46 32,-46 32,-2 Z" fill="#e63946" stroke="#0b1020" strokeWidth={4} />
		<path d="M-31,-12 L31,-12" stroke="#7a1520" strokeWidth={7} />
	</g>
);

// The stickman after he's been pancaked: lying flat, origin at the middle of his back on the ground.
export const FlatBody: React.FC<{squash?: number}> = ({squash = 1}) => {
	const ink = '#0b1020';
	return (
		<g transform={`scale(1,${squash})`}>
			<g stroke="#fff" strokeWidth={10} strokeLinecap="round" fill="none">
				<line x1={-90} y1={-8} x2={70} y2={-8} />
				<path d="M70,-8 L118,-22 L150,-8" />
				<path d="M70,-8 L120,4 L156,-4" />
				<path d="M-60,-8 L-30,-30 L10,-22" />
				<path d="M-60,-8 L-28,10 L14,4" />
			</g>
			<ellipse cx={-128} cy={-16} rx={44} ry={18} fill="#fff" stroke={ink} strokeWidth={4} />
			<g stroke={ink} strokeWidth={4} strokeLinecap="round">
				<line x1={-146} y1={-22} x2={-136} y2={-12} />
				<line x1={-146} y1={-12} x2={-136} y2={-22} />
				<line x1={-122} y1={-22} x2={-112} y2={-12} />
				<line x1={-122} y1={-12} x2={-112} y2={-22} />
			</g>
			<g transform="translate(-186,-10) rotate(-25) scale(0.8,0.55)">
				<Hat />
			</g>
		</g>
	);
};
