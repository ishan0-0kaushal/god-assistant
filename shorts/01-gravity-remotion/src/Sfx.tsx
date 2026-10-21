import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {ladderEvents} from './ladder';
import {
	BEATS,
	COLLAPSE_END,
	COLLAPSE_START,
	DURATION_S,
	f,
	FPS,
	REWIND_START,
	SURFACE_START,
	beat,
	simAt,
} from './timeline';

type Cue = {at: number; file: string; volume: number};

const buildCues = (): Cue[] => {
	const cues: Cue[] = [
		{at: f(REWIND_START), file: 'rewind.wav', volume: 0.7},
		{at: f(SURFACE_START), file: 'whoosh.wav', volume: 0.8},
		{at: f(beat('elephant').start), file: 'whoosh.wav', volume: 0.8},
		{at: f(beat('light').start), file: 'drone.wav', volume: 0.8},
		{at: f(COLLAPSE_START), file: 'collapse.wav', volume: 0.9},
		{at: f(COLLAPSE_END), file: 'boom_big.wav', volume: 1},
	];

	// A tick each time the sim clock passes a whole second, rising in pitch.
	let last = Math.floor(simAt(SURFACE_START));
	for (let fr = f(SURFACE_START) + 1; fr < FPS * DURATION_S; fr++) {
		const n = Math.floor(simAt(fr / FPS));
		if (n > last) {
			cues.push({at: fr, file: `tick_${Math.min(30, n)}.wav`, volume: 0.9});
			last = n;
		}
	}

	for (const b of BEATS) {
		if (b.start > SURFACE_START && b.id !== 'light' && b.id !== 'end') {
			cues.push({at: f(b.start), file: 'boom.wav', volume: 0.75});
		}
	}

	for (const e of ladderEvents()) {
		cues.push({at: f(e.land), file: 'thud.wav', volume: 0.9});
		cues.push({at: f(e.launch), file: 'whoosh.wav', volume: 0.7});
	}
	return cues;
};

export const Sfx: React.FC = () => {
	const cues = React.useMemo(buildCues, []);
	return (
		<>
			{cues.map((c, i) => (
				<Sequence key={i} from={c.at} layout="none">
					<Audio src={staticFile(`sfx/${c.file}`)} volume={c.volume} />
				</Sequence>
			))}
		</>
	);
};
