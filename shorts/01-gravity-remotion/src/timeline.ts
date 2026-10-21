import {Easing, interpolate} from 'remotion';

export const FPS = 30;
export const DURATION_S = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const C_KMS = 299792.458;
export const EARTH_ESCAPE_KMS = 11.186;
export const BODY_KG = 70;

// Seconds of doubling until Earth's escape speed reaches light speed (~29.42).
export const BLACK_HOLE_SIM = Math.log2((C_KMS / EARTH_ESCAPE_KMS) ** 2);

export type BeatId =
	| 'hook'
	| 'start'
	| 'g2'
	| 'g8'
	| 'sun'
	| 'elephant'
	| 'ocean'
	| 'jet'
	| 'eiffel'
	| 'titanic'
	| 'empire'
	| 'pyramid'
	| 'light'
	| 'end';

export type Beat = {
	id: BeatId;
	// Real playback time in seconds.
	start: number;
	end: number;
	// Simulated seconds of doubling the counter reaches during this beat.
	sim: number;
	vo: string;
};

// Real-time beats. When the voiceover exists, regenerate start/end from its
// word timestamps; everything on screen keys off these numbers.
export const BEATS: Beat[] = [
	{id: 'hook', start: 0, end: 2.4, sim: 30, vo: 'In thirty seconds, Earth becomes a black hole.'},
	{id: 'start', start: 2.4, end: 4.0, sim: 0, vo: 'Gravity doubles every second.'},
	{id: 'g2', start: 4.0, end: 6.6, sim: 1, vo: 'Two G: every step, you carry a second you.'},
	{id: 'g8', start: 6.6, end: 8.4, sim: 3, vo: 'Eight: you black out.'},
	{id: 'sun', start: 8.4, end: 10.6, sim: 5, vo: 'Thirty-two: heavier than standing on the Sun.'},
	{id: 'elephant', start: 10.6, end: 12.8, sim: 7, vo: 'Your body now outweighs an elephant.'},
	{id: 'ocean', start: 12.8, end: 16.0, sim: 10, vo: 'A thousand G: the air presses like ten kilometers under the sea.'},
	{id: 'jet', start: 16.0, end: 17.4, sim: 14, vo: 'A jumbo jet.'},
	{id: 'eiffel', start: 17.4, end: 18.9, sim: 18, vo: 'The Eiffel Tower.'},
	{id: 'titanic', start: 18.9, end: 20.4, sim: 20, vo: 'The Titanic.'},
	{id: 'empire', start: 20.4, end: 22.0, sim: 23, vo: 'The Empire State Building.'},
	{id: 'pyramid', start: 22.0, end: 23.6, sim: 27, vo: 'The Great Pyramid.'},
	{id: 'light', start: 23.6, end: 27.6, sim: BLACK_HOLE_SIM, vo: "Now, to leave Earth, you'd have to move faster than light."},
	{id: 'end', start: 27.6, end: 30.0, sim: 30, vo: 'Nothing gets out.'},
];

export const REWIND_START = 1.9;
export const SURFACE_START = 2.4;
export const ZOOM_OUT_START = 23.6;
export const ZOOM_OUT_END = 24.5;
export const COLLAPSE_START = 27.6;
export const COLLAPSE_END = 28.4;

export const beat = (id: BeatId): Beat => {
	const b = BEATS.find((x) => x.id === id);
	if (!b) {
		throw new Error(`Unknown beat ${id}`);
	}
	return b;
};

export const beatAt = (t: number): Beat => {
	for (let i = BEATS.length - 1; i >= 0; i--) {
		if (t >= BEATS[i].start) {
			return BEATS[i];
		}
	}
	return BEATS[0];
};

// Simulated seconds shown on the clock at real time t.
export const simAt = (t: number): number => {
	if (t < REWIND_START) {
		return 30;
	}
	if (t < SURFACE_START) {
		return interpolate(t, [REWIND_START, SURFACE_START], [30, 0], {
			easing: Easing.in(Easing.cubic),
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});
	}
	const idx = BEATS.findIndex((b) => b === beatAt(t));
	const b = BEATS[idx];
	const prevSim = idx > 1 ? BEATS[idx - 1].sim : 0;
	if (b.id === 'light') {
		// Slow start, then rush: the light bar fills in the last two seconds.
		return interpolate(t, [b.start, b.end - 0.3], [prevSim, b.sim], {
			easing: Easing.in(Easing.quad),
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});
	}
	const ramp = b.id === 'end' ? 0.6 : 0.45;
	return interpolate(t, [b.start, b.start + ramp], [prevSim, b.sim], {
		easing: Easing.out(Easing.cubic),
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
};

export const gravityAt = (sim: number) => 2 ** sim;
export const escapeKms = (sim: number) => EARTH_ESCAPE_KMS * 2 ** (sim / 2);

// Seconds -> frame helper.
export const f = (s: number) => Math.round(s * FPS);
