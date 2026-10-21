import {interpolate} from 'remotion';
import {ObjectKey} from './components/Objects';
import {FlyingObject} from './components/Scale';
import {beat, BeatId} from './timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Objects that land on the scale, in order.
const LADDER: {key: ObjectKey; beat: BeatId}[] = [
	{key: 'elephant', beat: 'elephant'},
	{key: 'jet', beat: 'jet'},
	{key: 'eiffel', beat: 'eiffel'},
	{key: 'titanic', beat: 'titanic'},
	{key: 'empire', beat: 'empire'},
	{key: 'pyramid', beat: 'pyramid'},
];

type LadderState = {object: FlyingObject | null; tilt: number; landed: boolean; key: ObjectKey | null};

const ladderTiming = (key: ObjectKey) => {
	const b = beat(LADDER.find((l) => l.key === key)!.beat);
	const dropStart = b.start + (key === 'elephant' ? 0.2 : 0);
	const land = dropStart + 0.28;
	const launch = Math.min(b.start + 1.25, b.start + (b.end - b.start) * 0.55);
	return {dropStart, land, launch};
};

export const ladderEvents = () =>
	LADDER.map(({key}) => ({key, ...ladderTiming(key)}));

export const ladderAt = (t: number): LadderState => {
	const BASE = 13;
	for (const {key} of [...LADDER].reverse()) {
		const {dropStart, land, launch} = ladderTiming(key);
		if (t < dropStart) {
			continue;
		}
		const u = t - launch;
		if (u > 1.0) {
			return {object: null, tilt: BASE, landed: false, key: null};
		}
		let dx = 0;
		let dy = 0;
		let rot = 0;
		let tilt = BASE;
		if (t < land) {
			const p = (t - dropStart) / (land - dropStart);
			dy = -1000 * (1 - p * p);
		} else if (t < launch) {
			const v = t - land;
			dy = -36 * Math.abs(Math.sin((Math.PI * v) / 0.16)) * Math.exp(-v / 0.1);
			tilt = interpolate(t, [land, land + 0.12, launch], [BASE, -5, 1], clamp);
		} else {
			dx = 1150 * u;
			dy = -1800 * u + 1500 * u * u;
			rot = 560 * u;
			tilt = interpolate(t, [launch, launch + 0.08, launch + 0.35], [1, 20, BASE], clamp);
		}
		return {object: {key, dx, dy, rot, opacity: 1}, tilt, landed: t >= land && t < launch + 0.15, key};
	}
	return {object: null, tilt: BASE, landed: false, key: null};
};

