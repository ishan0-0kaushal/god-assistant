/* Actually Animated style kit: deterministic drawing and HUD helpers for HyperFrames
   compositions. Everything is a pure function of time so any frame can render alone. */
(function () {
	const K = (window.K = {});
	const TAU = Math.PI * 2;
	const D = Math.PI / 180;
	const W = 1080;
	const H = 1920;

	// ---------- Math ----------
	K.clamp01 = (x) => Math.max(0, Math.min(1, x));
	K.seg = (t, a, b) => K.clamp01((t - a) / (b - a));
	K.lerp = (a, b, p) => a + (b - a) * p;
	K.ease = {
		out: (p) => 1 - Math.pow(1 - p, 3),
		in: (p) => p * p * p,
		inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
		back: (p) => 1 + 2.9 * Math.pow(p - 1, 3) + 1.9 * Math.pow(p - 1, 2),
		expoOut: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
	};
	K.fmt = (n) => Math.round(n).toLocaleString('en-US');
	K.rng = (seed) => {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	};
	const mix = (a, b, p) => a.map((v, i) => Math.round(v + (b[i] - v) * p));

	// ---------- Envelopes ----------
	// Pop in with overshoot, leave with a blur-out.
	K.pop = (t, at, until = Infinity, inDur = 0.22, outDur = 0.2) => {
		const pin = K.seg(t, at, at + inDur);
		const pout = until === Infinity ? 0 : K.seg(t, until - outDur, until);
		return {
			vis: pin * (1 - pout),
			scale: (0.6 + 0.4 * K.ease.back(pin)) * (1 - 0.12 * pout),
			blur: (1 - pin) * 10 + pout * 12,
		};
	};
	K.apply = (el, p, base = '') => {
		el.style.opacity = p.vis;
		el.style.visibility = p.vis <= 0.001 ? 'hidden' : 'visible';
		el.style.transform = `${base} scale(${p.scale})`;
		el.style.filter = p.blur > 0.4 ? `blur(${p.blur}px)` : 'none';
	};
	// Decaying shake from a list of hits: [{at, amp, dur}].
	K.shake = (t, hits) => {
		let a = 0;
		for (const h of hits) {
			if (t >= h.at && t < h.at + (h.dur || 0.45)) a += h.amp * Math.exp(-(t - h.at) / ((h.dur || 0.45) / 4));
		}
		return {x: a * Math.sin(t * 97), y: a * Math.cos(t * 83)};
	};
	// Peaked 0..1 amount for glitch / blur-through events: [{at, dur}].
	K.pulse = (t, events) => {
		let v = 0;
		for (const e of events) {
			const p = K.seg(t, e.at - e.dur / 2, e.at + e.dur / 2);
			if (p > 0 && p < 1) v = Math.max(v, Math.sin(p * Math.PI));
		}
		return v;
	};

	K.h = (html) => {
		const tpl = document.createElement('template');
		tpl.innerHTML = html.trim();
		return tpl.content.firstElementChild;
	};

	// ---------- Dot-matrix globe ----------
	K.Globe = class {
		constructor(canvas, opts = {}) {
			this.c = canvas;
			this.ctx = canvas.getContext('2d');
			let pts = opts.points || window.LAND_DOTS;
			if (opts.full) {
				const a = [];
				const step = opts.step || 2.4;
				for (let lat = -88; lat <= 88; lat += step) {
					const ls = step / Math.max(0.05, Math.cos(lat * D));
					for (let lon = -180; lon < 180; lon += ls) a.push(lat, lon);
				}
				pts = new Float32Array(a);
			}
			const n = pts.length / 2;
			this.n = n;
			this.sinLat = new Float32Array(n);
			this.cosLat = new Float32Array(n);
			this.lon = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				this.sinLat[i] = Math.sin(pts[2 * i] * D);
				this.cosLat[i] = Math.cos(pts[2 * i] * D);
				this.lon[i] = pts[2 * i + 1] * D;
			}
		}
		clear() {
			this.ctx.clearRect(0, 0, W, H);
		}
		// View: {cx, cy, r, spin, tilt, dot, color, limb, ocean, oceanColors, glow, alpha, collapse}
		draw(v) {
			const ctx = this.ctx;
			const {cx, cy, r} = v;
			const alpha = v.alpha ?? 1;
			const col = v.color || [240, 248, 248];
			const limb = v.limb || [120, 160, 255];
			const collapse = v.collapse || 0;
			const rr = r * (1 - collapse * 0.82);
			if (alpha <= 0) return;
			ctx.save();
			ctx.globalAlpha = alpha;
			if (v.ocean !== false) {
				const oc = v.oceanColors || ['#16306a', '#0a1636', '#2a5bc4'];
				ctx.shadowColor = v.glow || 'rgba(70,130,255,0.85)';
				ctx.shadowBlur = Math.min(120, 40 + r * 0.08);
				const g = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.35, rr * 0.05, cx, cy, rr);
				g.addColorStop(0, collapse > 0 ? mixHex(oc[0], '#000000', collapse) : oc[0]);
				g.addColorStop(0.8, collapse > 0 ? mixHex(oc[1], '#000000', collapse) : oc[1]);
				g.addColorStop(1, collapse > 0 ? mixHex(oc[2], '#000000', collapse) : oc[2]);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(cx, cy, rr, 0, TAU);
				ctx.fill();
				ctx.shadowBlur = 0;
			}
			const lam0 = (v.spin || 0) * D;
			const phi0 = (v.tilt || 0) * D;
			const sp0 = Math.sin(phi0);
			const cp0 = Math.cos(phi0);
			const size = v.dot ?? Math.max(1.6, r * 0.0068);
			const buckets = [[], [], [], [], []];
			const swirl = collapse * collapse * 4;
			const shrink = Math.pow(1 - collapse, 1.6);
			for (let i = 0; i < this.n; i++) {
				const dl = this.lon[i] - lam0;
				const cd = Math.cos(dl);
				const z = sp0 * this.sinLat[i] + cp0 * this.cosLat[i] * cd;
				if (z <= 0.02) continue;
				let x = this.cosLat[i] * Math.sin(dl);
				let y = cp0 * this.sinLat[i] - sp0 * this.cosLat[i] * cd;
				if (collapse > 0) {
					const a = swirl * (1.2 - Math.hypot(x, y));
					const ca = Math.cos(a);
					const sa = Math.sin(a);
					const nx = (x * ca - y * sa) * shrink;
					y = (x * sa + y * ca) * shrink;
					x = nx;
				}
				const px = cx + r * x;
				const py = cy - r * y;
				if (px < -size || px > W + size || py < -size || py > H + size) continue;
				buckets[Math.min(4, Math.floor(z * 5))].push(px, py);
			}
			for (let b = 0; b < 5; b++) {
				const z = (b + 0.5) / 5;
				const c = mix(limb, col, Math.pow(z, 0.6));
				ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.35 + 0.65 * z})`;
				const arr = buckets[b];
				const s = size * (0.75 + 0.25 * z);
				if (s > 6) {
					ctx.beginPath();
					for (let j = 0; j < arr.length; j += 2) {
						ctx.moveTo(arr[j] + s / 2, arr[j + 1]);
						ctx.arc(arr[j], arr[j + 1], s / 2, 0, TAU);
					}
					ctx.fill();
				} else {
					for (let j = 0; j < arr.length; j += 2) ctx.fillRect(arr[j] - s / 2, arr[j + 1] - s * 0.4, s, s * 0.8);
				}
			}
			ctx.restore();
		}
		project(v, lat, lon) {
			const dl = lon * D - (v.spin || 0) * D;
			const phi0 = (v.tilt || 0) * D;
			const sl = Math.sin(lat * D);
			const cl = Math.cos(lat * D);
			const x = cl * Math.sin(dl);
			const y = Math.cos(phi0) * sl - Math.sin(phi0) * cl * Math.cos(dl);
			const z = Math.sin(phi0) * sl + Math.cos(phi0) * cl * Math.cos(dl);
			return {x: v.cx + v.r * x, y: v.cy - v.r * y, z};
		}
		// Glowing latitude line; dashed where it runs behind the globe, chevrons show the spin.
		latRing(v, lat, o = {}) {
			const ctx = this.ctx;
			const color = o.color || '#f82838';
			const pts = [];
			for (let lon = -180; lon <= 180; lon += 2) pts.push(this.project(v, lat, lon + (v.spin || 0)));
			ctx.save();
			ctx.globalAlpha = o.alpha ?? 1;
			ctx.lineCap = 'round';
			ctx.strokeStyle = color;
			ctx.setLineDash([10, 12]);
			ctx.lineWidth = 3;
			ctx.globalAlpha *= 0.45;
			ctx.beginPath();
			pts.forEach((p, i) => (p.z <= 0 ? (i && pts[i - 1].z <= 0 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)) : null));
			ctx.stroke();
			ctx.globalAlpha = o.alpha ?? 1;
			ctx.setLineDash([]);
			ctx.shadowColor = color;
			ctx.shadowBlur = 24;
			ctx.lineWidth = o.width || 9;
			ctx.beginPath();
			pts.forEach((p, i) => (p.z > 0 ? (i && pts[i - 1].z > 0 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)) : null));
			ctx.stroke();
			ctx.shadowBlur = 0;
			ctx.lineWidth = o.width ? o.width * 0.4 : 3.5;
			ctx.strokeStyle = '#fff3f3';
			ctx.stroke();
			if (o.chevrons) {
				ctx.strokeStyle = color;
				ctx.lineWidth = 5;
				ctx.globalAlpha = (o.alpha ?? 1) * 0.7;
				for (let k = 0; k < 12; k++) {
					const lon = ((k * 30 + (o.phase || 0) * 30) % 360) - 180 + (v.spin || 0);
					const p = this.project(v, lat - (o.chevronOffset ?? 4), lon);
					const q = this.project(v, lat - (o.chevronOffset ?? 4), lon + 3);
					if (p.z <= 0.15) continue;
					const a = Math.atan2(q.y - p.y, q.x - p.x);
					ctx.save();
					ctx.translate(p.x, p.y);
					ctx.rotate(a);
					ctx.beginPath();
					ctx.moveTo(-8, -12);
					ctx.lineTo(6, 0);
					ctx.lineTo(-8, 12);
					ctx.stroke();
					ctx.restore();
				}
			}
			ctx.restore();
		}
	};
	function mixHex(a, b, p) {
		const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
		const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
		const m = mix(pa, pb, p);
		return `rgb(${m[0]},${m[1]},${m[2]})`;
	}

	// Black hole: dark disk, photon ring and an accretion disk split into back and front halves.
	K.blackHole = (ctx, cx, cy, r, phase, alpha = 1) => {
		if (alpha <= 0) return;
		ctx.save();
		ctx.globalAlpha = alpha;
		const disk = (from, to) => {
			ctx.save();
			ctx.shadowColor = 'rgba(255,140,40,0.95)';
			ctx.shadowBlur = 40;
			ctx.lineWidth = r * 0.34;
			const g = ctx.createLinearGradient(cx - r * 3.4, cy, cx + r * 3.4, cy);
			g.addColorStop(0, '#ff5a00');
			g.addColorStop(0.5, '#fff1c2');
			g.addColorStop(1, '#ff5a00');
			ctx.strokeStyle = g;
			ctx.setLineDash([r * 0.9, r * 0.22]);
			ctx.lineDashOffset = -phase * r * 40;
			ctx.beginPath();
			ctx.ellipse(cx, cy, r * 3.4, r * 0.72, 0, from, to);
			ctx.stroke();
			ctx.restore();
		};
		const halo = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 2.6);
		halo.addColorStop(0, 'rgba(255,170,70,0.55)');
		halo.addColorStop(1, 'rgba(255,120,40,0)');
		ctx.fillStyle = halo;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 2.6, 0, TAU);
		ctx.fill();
		disk(Math.PI, TAU);
		ctx.fillStyle = '#000';
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, TAU);
		ctx.fill();
		ctx.shadowColor = 'rgba(255,215,150,1)';
		ctx.shadowBlur = 30;
		ctx.strokeStyle = '#ffe9bf';
		ctx.lineWidth = r * 0.1;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 1.12, 0, TAU);
		ctx.stroke();
		ctx.restore();
		ctx.save();
		ctx.globalAlpha = alpha;
		disk(0, Math.PI);
		ctx.restore();
	};

	// ---------- Background streaks and stars ----------
	// Lines wrap a whole number of times per `dur`, so the first and last frames match.
	K.streaks = (ctx, t, o = {}) => {
		const n = o.n || 26;
		const rnd = K.rng(o.seed || 7);
		const dur = o.dur || 30;
		ctx.save();
		ctx.globalAlpha = o.alpha ?? 0.5;
		ctx.fillStyle = o.color || '#ffffff';
		for (let i = 0; i < n; i++) {
			const y = (o.yMin ?? 0) + rnd() * ((o.yMax ?? H) - (o.yMin ?? 0));
			const len = (o.minLen || 80) + rnd() * ((o.maxLen || 420) - (o.minLen || 80));
			const laps = Math.max(1, Math.round((1 + rnd() * 3) * (o.speed || 1) * (dur / 30)));
			const x0 = rnd() * (W + len);
			const span = W + len;
			const x = ((((x0 + (o.dir || -1) * t * laps * (span / dur)) % span) + span) % span) - len;
			const th = (o.thick || 2.5) * (0.6 + rnd() * 0.8);
			const a = 0.35 + rnd() * 0.65;
			ctx.globalAlpha = (o.alpha ?? 0.5) * a;
			// Vertical streaks run upward past a falling camera.
			if (o.vertical) ctx.fillRect((y / H) * W, (x / W) * H, th, (len * H) / W);
			else ctx.fillRect(x, y, len, th);
		}
		ctx.restore();
	};
	K.stars = (ctx, t, o = {}) => {
		const rnd = K.rng(o.seed || 3);
		ctx.save();
		ctx.fillStyle = '#ffffff';
		for (let i = 0; i < (o.n || 140); i++) {
			const x = rnd() * W;
			const y = rnd() * H;
			const r = 0.6 + rnd() * 1.6;
			const tw = rnd() * TAU;
			ctx.globalAlpha = (o.alpha ?? 1) * (0.25 + 0.3 * (1 + Math.sin((t / (o.dur || 30)) * TAU * 6 + tw)) / 2);
			ctx.beginPath();
			ctx.arc(x, y, r, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	};

	// Soft clouds drifting up (falling) or sideways; wraps a whole number of times per `dur`.
	K.clouds = (ctx, t, o = {}) => {
		const rnd = K.rng(o.seed || 21);
		const dur = o.dur || 30;
		ctx.save();
		for (let i = 0; i < (o.n || 7); i++) {
			const x = rnd() * W;
			const base = rnd() * (H + 600);
			const s = (o.size || 1) * (0.6 + rnd() * 0.9);
			const laps = Math.max(1, Math.round((1 + rnd() * 2) * (o.speed || 1) * (dur / 30)));
			const span = H + 600;
			const y = ((((base - t * laps * (span / dur)) % span) + span) % span) - 300;
			ctx.globalAlpha = (o.alpha ?? 0.5) * (0.5 + rnd() * 0.5);
			for (let k = 0; k < 4; k++) {
				const cx = x + (k - 1.5) * 90 * s;
				const cy = y + Math.sin(k * 1.7) * 26 * s;
				const r = (80 + 40 * Math.sin(k * 2.3 + i)) * s;
				const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
				g.addColorStop(0, o.color || 'rgba(225,235,255,0.9)');
				g.addColorStop(1, 'rgba(225,235,255,0)');
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, TAU);
				ctx.fill();
			}
		}
		ctx.restore();
	};

	// ---------- Particles ----------
	// Ballistic burst starting at t0: shape 'rock' (outlined polygon), 'dot' or 'confetti'.
	K.burst = (ctx, t, t0, o) => {
		const age = t - t0;
		if (age < 0 || age > (o.life || 1.2)) return;
		const rnd = K.rng(o.seed || 11);
		ctx.save();
		for (let i = 0; i < (o.n || 20); i++) {
			const ang = (o.angle?.[0] ?? 0) + rnd() * ((o.angle?.[1] ?? TAU) - (o.angle?.[0] ?? 0));
			const sp = (o.speed?.[0] ?? 200) + rnd() * ((o.speed?.[1] ?? 600) - (o.speed?.[0] ?? 200));
			const size = (o.size?.[0] ?? 6) + rnd() * ((o.size?.[1] ?? 14) - (o.size?.[0] ?? 6));
			const spin = (rnd() - 0.5) * 12;
			const x = o.x + Math.cos(ang) * sp * age + (o.wind || 0) * age * age;
			const y = o.y + Math.sin(ang) * sp * age + 0.5 * (o.g ?? 900) * age * age;
			ctx.globalAlpha = 1 - K.seg(age, (o.life || 1.2) * 0.6, o.life || 1.2);
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(spin * age);
			if (o.shape === 'dot') {
				ctx.fillStyle = o.fill || '#fff';
				ctx.beginPath();
				ctx.arc(0, 0, size / 2, 0, TAU);
				ctx.fill();
			} else if (o.shape === 'confetti') {
				ctx.fillStyle = o.palette ? o.palette[i % o.palette.length] : '#fff';
				ctx.fillRect(-size / 2, -size / 4, size, size / 2);
			} else {
				ctx.fillStyle = o.fill || '#5a3a22';
				ctx.strokeStyle = o.stroke || '#1a0f08';
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				for (let k = 0; k < 6; k++) {
					const a = (k / 6) * TAU;
					const rr = size / 2 * (0.75 + 0.25 * Math.sin(k * 2.1 + i));
					k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
				}
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			}
			ctx.restore();
		}
		ctx.restore();
	};

	// ---------- Stickman ----------
	const THIGH = 66, SHIN = 66, TORSO = 116, UPPER = 58, FORE = 56;
	K.HEAD_R = 38;
	const dirv = (d) => ({x: Math.sin(d * D), y: Math.cos(d * D)});
	K.POSES = {
		stand: {lHip: -8, lKnee: 0, rHip: 8, rKnee: 0, lSh: -16, lEl: -6, rSh: 24, rEl: 50, lean: 0},
		hold: {lHip: -8, lKnee: 0, rHip: 8, rKnee: 0, lSh: -16, lEl: -6, rSh: 30, rEl: 75, lean: 0},
		strain: {lHip: -40, lKnee: 55, rHip: 40, rKnee: -55, lSh: -150, lEl: -40, rSh: 150, rEl: 40, lean: 0},
		buckle: {lHip: -80, lKnee: 120, rHip: 80, rKnee: -120, lSh: -70, lEl: 80, rSh: 70, rEl: -80, lean: 0},
		shoulders: {lHip: -80, lKnee: 80, rHip: 80, rKnee: -80, lSh: -140, lEl: -20, rSh: 140, rEl: 20, lean: 0},
		shock: {lHip: -10, lKnee: 0, rHip: 10, rKnee: 0, lSh: -150, lEl: -20, rSh: 150, rEl: 20, lean: 0},
		handsHead: {lHip: -10, lKnee: 0, rHip: 10, rKnee: 0, lSh: -150, lEl: -120, rSh: 150, rEl: 120, lean: 0},
		point: {lHip: -10, lKnee: 0, rHip: 10, rKnee: 0, lSh: -20, lEl: -10, rSh: 95, rEl: 0, lean: 0},
		float: {lHip: -14, lKnee: 18, rHip: 10, rKnee: 22, lSh: -60, lEl: -30, rSh: 60, rEl: 30, lean: 0},
		fly: {lHip: -150, lKnee: 30, rHip: -120, rKnee: 60, lSh: 160, lEl: 10, rSh: 130, rEl: 20, lean: 80},
		fall: {lHip: -40, lKnee: 25, rHip: 40, rKnee: -25, lSh: -120, lEl: -25, rSh: 120, rEl: 25, lean: 0},
		jump: {lHip: -22, lKnee: 34, rHip: 26, rKnee: -12, lSh: -150, lEl: -20, rSh: 150, rEl: 20, lean: 0},
		land: {lHip: -60, lKnee: 80, rHip: 60, rKnee: -80, lSh: -100, lEl: -10, rSh: 100, rEl: 10, lean: 0},
		thumbs: {lHip: -8, lKnee: 0, rHip: 8, rKnee: 0, lSh: -18, lEl: -6, rSh: 90, rEl: 90, lean: 0},
		ouch: {lHip: -60, lKnee: 80, rHip: 30, rKnee: -110, lSh: -140, lEl: -30, rSh: 120, rEl: 40, lean: -6},
		wave: {lHip: -8, lKnee: 0, rHip: 8, rKnee: 0, lSh: -18, lEl: -6, rSh: 150, rEl: 25, lean: 0},
	};
	K.lerpPose = (a, b, p) => {
		const o = {};
		for (const k in a) o[k] = a[k] + (b[k] - a[k]) * p;
		return o;
	};
	const INK = '#0b1020';
	K.stick = (p, o = {}) => {
		const {eyes = 'dot', mouth = 'none', hat = 'bowler', anchor = 'feet', cup = false, fist = false} = o;
		const color = o.color || '#f8f8f8';
		const drop = (h, k) => THIGH * dirv(h).y + SHIN * dirv(h + k).y;
		const hip = {x: 0, y: anchor === 'feet' ? -Math.max(drop(p.lHip, p.lKnee), drop(p.rHip, p.rKnee)) : 0};
		const leg = (a, k) => {
			const d1 = dirv(a), kn = {x: hip.x + THIGH * d1.x, y: hip.y + THIGH * d1.y};
			const d2 = dirv(a + k), ft = {x: kn.x + SHIN * d2.x, y: kn.y + SHIN * d2.y};
			return `M${hip.x},${hip.y} L${kn.x},${kn.y} L${ft.x},${ft.y}`;
		};
		const up = {x: Math.sin(p.lean * D), y: -Math.cos(p.lean * D)};
		const neck = {x: hip.x + TORSO * up.x, y: hip.y + TORSO * up.y};
		const sh = {x: hip.x + (TORSO - 8) * up.x, y: hip.y + (TORSO - 8) * up.y};
		const head = {x: neck.x + (K.HEAD_R + 6) * up.x, y: neck.y + (K.HEAD_R + 6) * up.y};
		const arm = (s, e) => {
			const d1 = dirv(s + p.lean), el = {x: sh.x + UPPER * d1.x, y: sh.y + UPPER * d1.y};
			const d2 = dirv(s + e + p.lean), hand = {x: el.x + FORE * d2.x, y: el.y + FORE * d2.y};
			return {d: `M${sh.x},${sh.y} L${el.x},${el.y} L${hand.x},${hand.y}`, hand};
		};
		const la = arm(p.lSh, p.lEl), ra = arm(p.rSh, p.rEl);
		const body = `<g stroke="${color}" stroke-width="${o.stroke || 13}" stroke-linecap="round" stroke-linejoin="round" fill="none">
			<path d="${leg(p.lHip, p.lKnee)}"/><path d="${leg(p.rHip, p.rKnee)}"/>
			<line x1="${hip.x}" y1="${hip.y}" x2="${neck.x}" y2="${neck.y}"/><path d="${la.d}"/><path d="${ra.d}"/></g>`;
		if (o.silhouette) {
			return `${body}<circle cx="${head.x}" cy="${head.y}" r="${K.HEAD_R}" fill="${color}"/>`;
		}
		const eye = (side) => {
			const cx = side * 13 + (o.look || 0) * 5, cy = -4;
			if (eyes === 'x')
				return `<g stroke="${INK}" stroke-width="4.5" stroke-linecap="round"><line x1="${cx - 6}" y1="${cy - 6}" x2="${cx + 6}" y2="${cy + 6}"/><line x1="${cx - 6}" y1="${cy + 6}" x2="${cx + 6}" y2="${cy - 6}"/></g>`;
			if (eyes === 'wide')
				return `<circle cx="${cx}" cy="${cy}" r="10" fill="#fff" stroke="${INK}" stroke-width="3.5"/><circle cx="${cx + (o.look || 0) * 3}" cy="${cy}" r="4.5" fill="${INK}"/>`;
			if (eyes === 'red') return `<circle cx="${cx}" cy="${cy}" r="8" fill="#f82838"/>`;
			return `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${INK}"/>`;
		};
		const brow = o.brow ? `<path d="M2,-22 L24,-30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` : '';
		const mouths = {
			smile: `<path d="M-12,13 Q0,24 12,13" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
			o: `<ellipse cx="2" cy="17" rx="6" ry="8" fill="${INK}"/>`,
			grit: `<rect x="-13" y="10" width="26" height="12" rx="3" fill="#fff" stroke="${INK}" stroke-width="3.5"/><line x1="-13" y1="16" x2="13" y2="16" stroke="${INK}" stroke-width="2.5"/>`,
			flat: `<line x1="-9" y1="16" x2="9" y2="16" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
			none: '',
		};
		const hats = {
			bowler: `<g transform="translate(${o.hatX || 0},${-K.HEAD_R + 6 + (o.hatY || 0)}) rotate(${o.hatRot || 0})"><ellipse rx="40" ry="8" fill="#e63946" stroke="${INK}" stroke-width="3.5"/><path d="M-25,-2 C-25,-36 25,-36 25,-2 Z" fill="#e63946" stroke="${INK}" stroke-width="3.5"/><path d="M-24,-9 L24,-9" stroke="#7a1520" stroke-width="5"/></g>`,
			halo: `<ellipse cx="0" cy="${-K.HEAD_R - 26}" rx="28" ry="7" fill="none" stroke="#ffe066" stroke-width="5"/>`,
			helmet: `<circle r="54" fill="rgba(190,225,255,0.25)" stroke="#e9eef5" stroke-width="7"/><path d="M-36,-28 A46,46 0 0,1 8,-46" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`,
			none: '',
		};
		const hand = ra.hand;
		const cupMark = cup
			? `<g transform="translate(${hand.x + 4},${hand.y - 6})"><path d="M-13,-18 L13,-18 L10,18 L-10,18 Z" fill="#fff"/><path d="M-12,-8 L12,-8 L11,4 L-11,4 Z" fill="#ff9b45"/><rect x="-15" y="-24" width="30" height="7" rx="3" fill="#fff"/></g>`
			: '';
		const fistMark = fist
			? `<circle cx="${hand.x}" cy="${hand.y}" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><line x1="${hand.x}" y1="${hand.y - 8}" x2="${hand.x}" y2="${hand.y - 24}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`
			: '';
		return `${body}${cupMark}${fistMark}<g transform="translate(${head.x},${head.y}) rotate(${p.lean})">
			<circle r="${K.HEAD_R}" fill="#fff" stroke="${INK}" stroke-width="3.5"/>${eye(-1)}${eye(1)}${brow}${mouths[mouth] || ''}${hats[hat]}</g>`;
	};
	// Red afterimages behind a moving figure: frames is [{pose, x, y, rot, s}], oldest first.
	K.trail = (frames, o = {}) =>
		frames
			.map(
				(f, i) =>
					`<g opacity="${(o.alpha || 0.5) * ((i + 1) / frames.length)}" transform="translate(${f.x},${f.y}) rotate(${f.rot || 0}) scale(${f.s || 1})">${K.stick(f.pose, {color: o.color || '#ff3b4a', silhouette: true, anchor: f.anchor || 'hip', stroke: 13})}</g>`,
			)
			.join('');

	// ---------- HUD ----------
	K.Tracker = class {
		constructor(parent, label, names, opts = {}) {
			this.el = K.h(`<div class="tracker${opts.compact ? ' compact' : ''}"><div class="tracker-label">${label}</div><div class="tracker-row"></div></div>`);
			this.items = names.map((n) => {
				const it = K.h(`<div class="tp"><span class="nm">${n}</span><span class="badge">?</span></div>`);
				this.el.lastElementChild.appendChild(it);
				return it;
			});
			parent.appendChild(this.el);
		}
		// states: array of 'pending' | 'fail' | 'ok' (or [state, popProgress]).
		set(states, vis = 1) {
			this.el.style.opacity = vis;
			this.el.style.visibility = vis <= 0.001 ? 'hidden' : 'visible';
			states.forEach((s, i) => {
				const [state, p] = Array.isArray(s) ? s : [s, 1];
				const it = this.items[i];
				it.className = `tp ${state === 'pending' ? '' : state}`;
				it.lastElementChild.textContent = state === 'fail' ? '✕' : state === 'ok' ? '✓' : state === 'active' ? '•' : '?';
				it.style.transform = `scale(${state === 'pending' ? 1 : 1 + 0.18 * Math.sin(Math.min(1, p) * Math.PI)})`;
			});
		}
	};

	// Captions: the whole line is laid out centered, then words blur in one at a time.
	// Words wrapped in *asterisks* take the line's accent color.
	K.Captions = class {
		constructor(parent, lines) {
			this.lines = lines.map((ln) => {
				const el = K.h(`<div class="cap"></div>`);
				// Keep captions to two lines like the channel's style.
				if (ln.text.length > 46) el.style.setProperty('--fs', '54px');
				const words = [];
				let on = false;
				for (const raw of ln.text.split(' ')) {
					let w = raw;
					if (w.startsWith('*')) {
						on = true;
						w = w.slice(1);
					}
					let close = false;
					const m = w.match(/^(.*?)\*([^\w]*)$/);
					if (m) {
						w = m[1] + m[2];
						close = true;
					}
					const span = K.h(`<span class="w${on ? ` a-${ln.accent || 'red'}` : ''}"></span>`);
					span.textContent = w + ' ';
					el.appendChild(span);
					words.push(span);
					if (close) on = false;
				}
				parent.appendChild(el);
				const times = ln.words || autoTimes(ln, words.map((s) => s.textContent.trim()));
				return {...ln, el, words, times};
			});
		}
		set(t) {
			for (const ln of this.lines) {
				const on = t >= ln.start && t < ln.end;
				ln.el.style.visibility = on ? 'visible' : 'hidden';
				if (!on) continue;
				ln.words.forEach((w, i) => {
					const p = ln.hold ? 1 : K.seg(t, ln.times[i], ln.times[i] + 0.14);
					w.style.opacity = p;
					w.style.filter = p < 1 ? `blur(${(1 - p) * 9}px)` : 'none';
					w.style.transform = `translateY(${(1 - p) * 8}px)`;
				});
			}
		}
	};
	function autoTimes(ln, words) {
		const weights = words.map((w) => w.length + 3);
		const total = weights.reduce((a, b) => a + b, 0);
		const k = Math.min(0.036, (ln.end - ln.start - 0.3) / total);
		let acc = ln.start + 0.04;
		return weights.map((w) => {
			const at = acc;
			acc += w * k;
			return at;
		});
	}
})();
