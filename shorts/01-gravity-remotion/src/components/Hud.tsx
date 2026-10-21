import React from 'react';
import {formatG, formatSpeed, formatWeight} from '../format';
import {C_KMS} from '../timeline';

export const COLORS = {
	ink: '#0b1020',
	yellow: '#ffd23f',
	red: '#e63946',
	cyan: '#5be0ff',
	panel: 'rgba(8, 12, 30, 0.82)',
	white: '#ffffff',
};

const DISPLAY = 'Anton, Impact, sans-serif';
const LABEL = 'Inter, sans-serif';

const outline = (px: number, color = COLORS.ink): React.CSSProperties => ({
	WebkitTextStroke: `${px}px ${color}`,
	paintOrder: 'stroke fill',
});

export const Chip: React.FC<{
	children: React.ReactNode;
	color?: string;
	bg?: string;
	style?: React.CSSProperties;
}> = ({children, color = COLORS.white, bg = COLORS.panel, style}) => (
	<div
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: 14,
			padding: '12px 26px',
			borderRadius: 999,
			background: bg,
			border: `3px solid rgba(255,255,255,0.18)`,
			color,
			fontFamily: LABEL,
			fontWeight: 800,
			fontSize: 34,
			letterSpacing: 1,
			whiteSpace: 'nowrap',
			...style,
		}}
	>
		{children}
	</div>
);

export const CounterBar: React.FC<{g: number; sim: number; bodyKg: number; pop: number}> = ({
	g,
	sim,
	bodyKg,
	pop,
}) => {
	const text = formatG(g);
	const size = Math.min(190, 1500 / Math.max(4, text.length));
	return (
		<div
			style={{
				position: 'absolute',
				top: 70,
				left: 0,
				width: 1080,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					fontFamily: LABEL,
					fontWeight: 900,
					fontSize: 36,
					letterSpacing: 8,
					color: COLORS.cyan,
					...outline(6),
				}}
			>
				EARTH'S GRAVITY
			</div>
			<div
				style={{
					height: 200,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div
					style={{
						fontFamily: DISPLAY,
						fontSize: size,
						lineHeight: 1,
						color: COLORS.yellow,
						transform: `scale(${1 + pop * 0.18})`,
						textShadow: '0 10px 0 rgba(0,0,0,0.45)',
						fontVariantNumeric: 'tabular-nums',
						...outline(12),
					}}
				>
					{text}
				</div>
			</div>
			<div style={{display: 'flex', gap: 20, marginTop: 6}}>
				<Chip color={COLORS.cyan}>
					<ClockIcon /> {sim.toFixed(sim < 10 ? 1 : 0).replace(/\.0$/, '')} s
				</Chip>
				<Chip>
					<span style={{color: 'rgba(255,255,255,0.7)'}}>YOUR BODY</span>
					<span style={{color: COLORS.yellow}}>{formatWeight(bodyKg)}</span>
				</Chip>
			</div>
		</div>
	);
};

const ClockIcon: React.FC = () => (
	<svg width={34} height={34} viewBox="0 0 34 34">
		<circle cx={17} cy={19} r={13} fill="none" stroke={COLORS.cyan} strokeWidth={4} />
		<line x1={17} y1={19} x2={17} y2={11} stroke={COLORS.cyan} strokeWidth={4} strokeLinecap="round" />
		<line x1={12} y1={3} x2={22} y2={3} stroke={COLORS.cyan} strokeWidth={4} strokeLinecap="round" />
	</svg>
);

export const LightBar: React.FC<{kms: number; flash: number}> = ({kms, flash}) => {
	const fill = Math.min(1, kms / C_KMS);
	const full = kms >= C_KMS;
	return (
		<div
			style={{
				position: 'absolute',
				top: 1140,
				left: 70,
				width: 940,
				padding: '18px 26px 22px',
				borderRadius: 28,
				background: COLORS.panel,
				border: `3px solid rgba(255,255,255,0.16)`,
				boxShadow: full ? `0 0 ${40 + flash * 40}px rgba(255,255,255,${0.5 + flash * 0.4})` : 'none',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'baseline',
					fontFamily: LABEL,
					fontWeight: 800,
					fontSize: 30,
					color: 'rgba(255,255,255,0.8)',
					letterSpacing: 1,
				}}
			>
				<span>SPEED NEEDED TO LEAVE EARTH</span>
				<span style={{color: full ? COLORS.white : COLORS.cyan, fontWeight: 900, fontSize: 34}}>
					{full ? 'LIGHT SPEED' : formatSpeed(kms)}
				</span>
			</div>
			<div
				style={{
					position: 'relative',
					marginTop: 14,
					height: 40,
					borderRadius: 20,
					background: 'rgba(255,255,255,0.08)',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width: `${Math.max(fill * 100, 1.2)}%`,
						height: '100%',
						borderRadius: 20,
						background: `linear-gradient(90deg, #2a7fff, ${COLORS.cyan} 70%, #ffffff)`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						right: 10,
						top: 2,
						fontFamily: LABEL,
						fontWeight: 900,
						fontSize: 26,
						color: full ? COLORS.ink : 'rgba(255,255,255,0.85)',
					}}
				>
					LIGHT ⚡
				</div>
			</div>
		</div>
	);
};

export const Caption: React.FC<{text: string; pop: number}> = ({text, pop}) => (
	<div
		style={{
			position: 'absolute',
			top: 1300,
			left: 60,
			width: 960,
			height: 200,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			textAlign: 'center',
		}}
	>
		<div
			style={{
				fontFamily: DISPLAY,
				fontSize: text.length > 40 ? 66 : 78,
				lineHeight: 1.12,
				color: COLORS.white,
				textTransform: 'uppercase',
				transform: `scale(${0.88 + 0.12 * pop})`,
				opacity: pop,
				textShadow: '0 8px 0 rgba(0,0,0,0.5)',
				...outline(14),
			}}
		>
			{text}
		</div>
	</div>
);

export const Stamp: React.FC<{text: string; color: string; t: number; style?: React.CSSProperties}> = ({
	text,
	color,
	t,
	style,
}) => (
	<div
		style={{
			position: 'absolute',
			fontFamily: DISPLAY,
			fontSize: 54,
			color,
			border: `7px solid ${color}`,
			borderRadius: 14,
			padding: '2px 22px',
			transform: `rotate(-10deg) scale(${1.8 - 0.8 * t})`,
			opacity: t,
			background: 'rgba(8,12,30,0.75)',
			...style,
		}}
	>
		{text}
	</div>
);
