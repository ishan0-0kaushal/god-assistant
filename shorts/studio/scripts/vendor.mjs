// Copies GSAP and the fonts out of node_modules so compositions load them locally.
import {cpSync, mkdirSync} from 'node:fs';

mkdirSync('vendor', {recursive: true});
mkdirSync('assets/fonts', {recursive: true});
cpSync('node_modules/gsap/dist/gsap.min.js', 'vendor/gsap.min.js');
cpSync('node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2', 'assets/fonts/anton-400.woff2');
for (const w of [700, 800, 900]) {
	cpSync(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`, `assets/fonts/inter-${w}.woff2`);
}
