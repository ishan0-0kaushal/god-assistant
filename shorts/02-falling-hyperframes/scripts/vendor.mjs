// Copies GSAP and the fonts out of node_modules so the composition can load them
// locally (the render machine can't reach the CDN).
import {cpSync, mkdirSync} from 'node:fs';

mkdirSync('vendor', {recursive: true});
mkdirSync('assets/fonts', {recursive: true});
cpSync('node_modules/gsap/dist/gsap.min.js', 'vendor/gsap.min.js');
cpSync('node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2', 'assets/fonts/anton-400.woff2');
cpSync('node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2', 'assets/fonts/inter-800.woff2');
cpSync('node_modules/@fontsource/inter/files/inter-latin-900-normal.woff2', 'assets/fonts/inter-900.woff2');
