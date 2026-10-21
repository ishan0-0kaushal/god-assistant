import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Caption, Chip, COLORS, CounterBar, LightBar, Stamp} from './components/Hud';
import {OBJECTS} from './components/Objects';
import {Planet, PLANET_CX, PLANET_CY} from './components/Planet';
import {BalanceScale, scaleGeometry, toScreen} from './components/Scale';
import {FlatBody, lerpPose, Mouth, Eyes, Pose, POSES, Stickman} from './components/Stickman';
import {Ground, GROUND_Y, Starfield} from './components/Surface';
import {Sfx} from './Sfx';
import {formatWeight} from './format';
import {ladderAt, ladderEvents} from './ladder';
import {useFonts} from './fonts';
import {
	beat,
	beatAt,
	BEATS,
	BeatId,
	BODY_KG,
	C_KMS,
	COLLAPSE_END,
	COLLAPSE_START,
	DURATION_S,
	escapeKms,
	FPS,
	gravityAt,
	REWIND_START,
	simAt,
	SURFACE_START,
	ZOOM_OUT_END,
	ZOOM_OUT_START,
} from './timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ramp = (t: number, a: number, b: number, from = 0, to = 1, easing?: (x: number) => number) =>
	interpolate(t, [a, b], [from, to], {...clamp, easing});

const STICK_X = 300;
const SCALE_IN = beat('elephant').start;
const BLACKOUT = 7.0;
const SQUASH_END = 7.25;

type Look = {pose: Pose; eyes: Eyes; mouth: Mouth; look: number};
const GHOST_LOOKS: Partial<Record<BeatId, Look>> = {
	g8: {pose: POSES.float, eyes: 'wide', mouth: 'o', look: 0},
	sun: {pose: POSES.shock, eyes: 'wide', mouth: 'o', look: 1},
	elephant: {pose: POSES.point, eyes: 'wide', mouth: 'grit', look: 1},
	ocean: {pose: POSES.handsOnHead, eyes: 'wide', mouth: 'flat', look: 0},
	jet: {pose: POSES.shock, eyes: 'wide', mouth: 'o', look: 1},
	eiffel: {pose: POSES.handsOnHead, eyes: 'wide', mouth: 'o', look: 1},
	titanic: {pose: POSES.shock, eyes: 'wide', mouth: 'grit', look: 1},
	empire: {pose: POSES.handsOnHead, eyes: 'wide', mouth: 'o', look: 1},
	pyramid: {pose: POSES.shock, eyes: 'wide', mouth: 'o', look: 1},
	light: {pose: POSES.shock, eyes: 'wide', mouth: 'o', look: 1},
	end: {pose: POSES.shock, eyes: 'wide', mouth: 'o', look: 1},
};

const ghostLookAt = (t: number): Look => {
	const idx = BEATS.indexOf(beatAt(t));
	const cur = GHOST_LOOKS[BEATS[idx].id] ?? GHOST_LOOKS.g8!;
	const prev = GHOST_LOOKS[BEATS[idx - 1]?.id] ?? cur;
	const k = ramp(t, BEATS[idx].start, BEATS[idx].start + 0.18, 0, 1, Easing.out(Easing.cubic));
	return {...cur, pose: lerpPose(prev.pose, cur.pose, k)};
};

// Camera shake that kicks on every milestone and every object launch.
const shakeAt = (t: number) => {
	let a = 0;
	for (const b of BEATS) {
		if (b.start > SURFACE_START && t >= b.start && t < b.start + 0.5) {
			a += 16 * Math.exp(-(t - b.start) / 0.12);
		}
	}
	for (const e of ladderEvents()) {
		if (t >= e.launch && t < e.launch + 0.4) {
			a += 12 * Math.exp(-(t - e.launch) / 0.1);
		}
	}
	return {x: a * Math.sin(t * 93), y: a * Math.cos(t * 71)};
};

export const Gravity: React.FC = () => {
	useFonts();
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const phase = frame / (FPS * DURATION_S);

	const sim = simAt(t);
	const g = gravityAt(sim);
	const kms = escapeKms(sim);
	const b = beatAt(t);
	const sinceBeat = t - b.start;

	const counterPop = b.id === 'hook' ? 0 : ramp(sinceBeat, 0, 0.1) - ramp(sinceBeat, 0.1, 0.4);
	const captionPop = b.id === 'hook' ? 1 : ramp(sinceBeat, 0, 0.12, 0, 1, Easing.out(Easing.back(2)));
	const lightFlash = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 * 30);

	// Scene visibility and transitions.
	const surfaceOn = t >= SURFACE_START && t < ZOOM_OUT_START + 0.35;
	const planetOn = t < SURFACE_START || t >= ZOOM_OUT_START;
	const surfaceOut = ramp(t, ZOOM_OUT_START, ZOOM_OUT_START + 0.3, 0, 1, Easing.in(Easing.cubic));
	const planetIn = ramp(t, ZOOM_OUT_START + 0.15, ZOOM_OUT_END, 0, 1, Easing.out(Easing.cubic));
	const collapse =
		t < REWIND_START
			? 1
			: t < SURFACE_START
				? ramp(t, REWIND_START, SURFACE_START, 1, 0, Easing.in(Easing.cubic))
				: ramp(t, COLLAPSE_START, COLLAPSE_END, 0, 1, Easing.in(Easing.cubic));

	const shake = shakeAt(t);
	const ladder = ladderAt(t);

	// --- The stickman before he's flattened ---
	let pose: Pose = POSES.stand;
	let eyes: Eyes = 'dot';
	let mouth: Mouth = 'smile';
	let sweat = 0;
	let tremble = 0;
	const g2 = beat('g2').start;
	const g8 = beat('g8').start;
	if (t < g2) {
		pose = {...POSES.wave, rSh: 150 + 18 * Math.sin(t * 14)};
	} else if (t < g8) {
		pose = lerpPose(POSES.wave, POSES.crouch, ramp(t, g2, g2 + 0.3, 0, 1, Easing.out(Easing.back(1.6))));
		mouth = 'grit';
		sweat = ramp(t, g2 + 0.3, g2 + 0.6);
		tremble = 2.5;
	} else {
		pose = lerpPose(POSES.crouch, POSES.deepCrouch, ramp(t, g8, g8 + 0.25, 0, 1, Easing.out(Easing.cubic)));
		eyes = t < BLACKOUT ? 'wide' : 'x';
		mouth = t < BLACKOUT ? 'grit' : 'o';
		sweat = 1;
		tremble = 5;
	}
	const squashY = ramp(t, BLACKOUT, SQUASH_END, 1, 0.18, Easing.in(Easing.cubic));
	const squashX = ramp(t, BLACKOUT, SQUASH_END, 1, 1.5, Easing.in(Easing.cubic));
	const standing = t < SQUASH_END;
	const trembleX = tremble * Math.sin(t * 120);

	// Piggyback copy for the 2 G beat.
	const twinIn = ramp(t, g2 + 0.05, g2 + 0.35, 0, 1, Easing.out(Easing.bounce));
	const twinOut = ramp(t, g8, g8 + 0.1, 1, 0);
	const twinScale = 0.8 * (t < g8 ? 1 : twinOut);
	const showTwin = t >= g2 && t < g8 + 0.1;

	// --- Ghost ---
	const ghostStart = SQUASH_END + 0.05;
	const ghostRise = ramp(t, ghostStart, ghostStart + 0.8, 0, 1, Easing.out(Easing.cubic));
	const bob = 10 * Math.sin(phase * Math.PI * 2 * 20);
	const ghostSurface = {
		x: interpolate(ghostRise, [0, 1], [STICK_X, 150]),
		y: interpolate(ghostRise, [0, 1], [GROUND_Y - 10, 820]) + bob,
	};
	const ghostLook = ghostLookAt(t);
	const suck = ramp(t, COLLAPSE_START + 0.3, COLLAPSE_END + 0.5, 0, 1, Easing.in(Easing.quad));
	const spiral = suck * Math.PI * 2.2;
	const ghostPlanetBase = {x: 150, y: 1050};
	const rad0 = Math.hypot(ghostPlanetBase.x - PLANET_CX, ghostPlanetBase.y - PLANET_CY);
	const ang0 = Math.atan2(ghostPlanetBase.y - PLANET_CY, ghostPlanetBase.x - PLANET_CX);
	const ghostPlanet = {
		x: PLANET_CX + Math.cos(ang0 - spiral) * rad0 * (1 - suck),
		y: PLANET_CY + Math.sin(ang0 - spiral) * rad0 * (1 - suck) + bob * (1 - suck),
	};

	// --- Overlays ---
	const blackout = interpolate(t, [g8 + 0.15, BLACKOUT + 0.1, BLACKOUT + 0.35, BLACKOUT + 0.7], [0, 0.93, 0.93, 0], clamp);
	const flashAt = (start: number, dur: number, peak: number) => (t >= start ? ramp(t, start, start + dur, peak, 0) : 0);
	const flash = Math.max(
		flashAt(SURFACE_START, 0.12, 0.7),
		flashAt(SCALE_IN, 0.12, 0.7),
		flashAt(ZOOM_OUT_START + 0.2, 0.15, 0.5),
		flashAt(COLLAPSE_END, 0.25, 0.85),
	);
	const rewinding = t >= REWIND_START && t < SURFACE_START;
	const shock = ramp(t, COLLAPSE_END, COLLAPSE_END + 0.9);

	const sun = beat('sun');
	const ocean = beat('ocean');
	const geo = scaleGeometry(ladder.tilt);

	return (
		<AbsoluteFill style={{backgroundColor: '#05081a', overflow: 'hidden'}}>
			<Starfield phase={phase} />

			{/* ---------- Planet scene (hook, zoom-out, collapse) ---------- */}
			{planetOn ? (
				<AbsoluteFill
					style={{
						opacity: t >= ZOOM_OUT_START ? planetIn : 1,
						transform: t >= ZOOM_OUT_START ? `scale(${interpolate(planetIn, [0, 1], [1.7, 1])})` : undefined,
						transformOrigin: `${PLANET_CX}px ${PLANET_CY}px`,
					}}
				>
					<Planet
						collapse={collapse}
						lightFill={Math.min(1, kms / C_KMS)}
						atmo={Math.max(3, 60 / Math.pow(g, 0.25))}
						phase={phase}
					/>
					{t >= ZOOM_OUT_START && suck < 1 ? (
						<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
							<g
								transform={`translate(${ghostPlanet.x},${ghostPlanet.y}) rotate(${suck * 720}) scale(${0.6 * (1 - suck) * (1 + suck * 0.8)},${0.6 * (1 - suck)})`}
							>
								<Stickman pose={POSES.shock} eyes="wide" mouth="o" look={1} ghost opacity={1 - suck * 0.6} />
							</g>
						</svg>
					) : null}
					{shock > 0 && shock < 1 ? (
						<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
							<circle
								cx={PLANET_CX}
								cy={PLANET_CY}
								r={70 + shock * 760}
								fill="none"
								stroke="#ffffff"
								strokeWidth={14 * (1 - shock) + 2}
								opacity={1 - shock}
							/>
						</svg>
					) : null}
				</AbsoluteFill>
			) : null}

			{/* ---------- Surface scene ---------- */}
			{surfaceOn ? (
				<AbsoluteFill
					style={{
						opacity: 1 - surfaceOut,
						transform: `translate(${shake.x}px, ${shake.y + surfaceOut * 900}px)`,
					}}
				>
					<Ground g={g} />
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						{t >= SCALE_IN ? (
							<BalanceScale
								tilt={ladder.tilt}
								object={ladder.object}
								bodySquash={Math.max(0.35, 1 - Math.log2(g) / 40)}
							/>
						) : null}

						{/* Standing / crouching / flattened stickman */}
						{t < SCALE_IN ? (
							standing ? (
								<g transform={`translate(${STICK_X + trembleX},${GROUND_Y}) scale(${squashX},${squashY})`}>
									<Stickman pose={pose} eyes={eyes} mouth={mouth} sweat={sweat} />
									{showTwin ? (
										<g transform={`translate(0,${-294 + 60 - (1 - twinIn) * 420}) scale(${twinScale})`}>
											<Stickman pose={POSES.shoulders} mouth="smile" eyes="dot" />
										</g>
									) : null}
								</g>
							) : (
								<g transform={`translate(${STICK_X + 20},${GROUND_Y + 4}) scale(1.3)`}>
									<FlatBody squash={Math.max(0.5, 1 - Math.log2(g) / 30)} />
								</g>
							)
						) : null}

						{/* Ghost */}
						{t >= ghostStart ? (
							<g transform={`translate(${ghostSurface.x},${ghostSurface.y}) scale(${ramp(t, ghostStart, ghostStart + 0.25, 0.4, 1)})`}>
								<Stickman pose={ghostLook.pose} eyes={ghostLook.eyes} mouth={ghostLook.mouth} look={ghostLook.look} ghost />
							</g>
						) : null}
					</svg>

					{/* You vs the object, while it sits on the pan */}
					{ladder.landed && ladder.key ? (
						<>
							<div style={{position: 'absolute', left: toScreen(geo.leftPan).x - 200, width: 400, top: toScreen(geo.leftPan).y - 170, display: 'flex', justifyContent: 'center'}}>
								<Chip color={COLORS.yellow} style={{fontSize: 36}}>
									YOU <span style={{color: COLORS.white}}>{formatWeight(BODY_KG * g)}</span>
								</Chip>
							</div>
							<div style={{position: 'absolute', left: 0, width: 1080, top: 430, display: 'flex', justifyContent: 'center'}}>
								<Chip color={COLORS.white} style={{fontSize: 36}}>
									{OBJECTS[ladder.key].label}
									<span style={{color: COLORS.yellow}}>{OBJECTS[ladder.key].weight}</span>
								</Chip>
							</div>
						</>
					) : null}

					{/* Sun badge */}
					{t >= sun.start && t < sun.end ? (
						<div style={{position: 'absolute', top: 440, left: 0, width: 1080, display: 'flex', justifyContent: 'center'}}>
							<div style={{transform: `scale(${ramp(t, sun.start, sun.start + 0.2, 0.3, 1, Easing.out(Easing.back(2)))})`, position: 'relative'}}>
								<Chip color="#ffb703" style={{fontSize: 38}}>
									☀ SUN'S SURFACE: 28 G
								</Chip>
								<Stamp text="PASSED" color={COLORS.red} t={ramp(t, sun.start + 0.45, sun.start + 0.6)} style={{right: -40, top: 70}} />
							</div>
						</div>
					) : null}

					{/* Air pressure chip */}
					{t >= ocean.start && t < ocean.end ? (
						<div style={{position: 'absolute', top: 430, left: 0, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
							<div style={{transform: `scale(${ramp(t, ocean.start, ocean.start + 0.2, 0.3, 1, Easing.out(Easing.back(2)))})`}}>
								<Chip color={COLORS.cyan} style={{fontSize: 38}}>
									AIR PRESSURE: 1,024 atm
								</Chip>
							</div>
							<div style={{opacity: ramp(t, ocean.start + 0.9, ocean.start + 1.1)}}>
								<Chip style={{fontSize: 34}}>🌊 = 10 km UNDER THE SEA</Chip>
							</div>
						</div>
					) : null}
				</AbsoluteFill>
			) : null}

			{/* Blackout tunnel */}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle at 30% 55%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 28%, #000 55%)',
					opacity: blackout,
				}}
			/>

			{/* Rewind effect */}
			{rewinding ? <Rewind t={t} /> : null}

			{/* HUD */}
			<CounterBar g={g} sim={sim} bodyKg={BODY_KG * g} pop={counterPop} />
			<LightBar kms={kms} flash={lightFlash} />
			<Caption text={b.vo} pop={captionPop} />

			<AbsoluteFill style={{background: '#fff', opacity: flash}} />
			<Sfx />
		</AbsoluteFill>
	);
};

const Rewind: React.FC<{t: number}> = ({t}) => {
	const jitter = 10 * Math.sin(t * 160);
	return (
		<AbsoluteFill style={{transform: `translateX(${jitter}px)`}}>
			<AbsoluteFill
				style={{
					background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 3px, rgba(0,0,0,0) 3px 9px)',
				}}
			/>
			<AbsoluteFill style={{background: 'rgba(80,120,255,0.12)'}} />
			<div
				style={{
					position: 'absolute',
					top: 560,
					width: 1080,
					textAlign: 'center',
					fontFamily: 'Anton, sans-serif',
					fontSize: 150,
					color: '#fff',
					WebkitTextStroke: `12px ${COLORS.ink}`,
					paintOrder: 'stroke fill',
					letterSpacing: -10,
				}}
			>
				◀◀
			</div>
		</AbsoluteFill>
	);
};
