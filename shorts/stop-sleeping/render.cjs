// Render build/timeline.json with headless Chromium.
//   node render.cjs                         full render -> build/video.mp4 (silent)
//   node render.cjs --stills 0,45,90        PNG stills of those frames
//   node render.cjs --scene s2 --every 6    PNG stills of every 6th frame of one scene
//   ... --outdir build/stills_s2 --sheet    choose the folder; --sheet also tiles a labelled
//                                           contact sheet (<outdir>/sheet.png) to look at
// Frames are spread over several pages; each frame is a pure function of its index.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BUILD = path.join(ROOT, 'build');
const PAGES = Number(process.env.RENDER_PAGES || 3);
const LABEL_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const timeline = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));
  let stills = null;
  if (arg('--stills')) stills = arg('--stills').split(',').map(Number);
  if (arg('--scene')) {
    const S = timeline.scenes.find((s) => s.id === arg('--scene'));
    if (!S) throw new Error(`unknown scene ${arg('--scene')}`);
    const every = Number(arg('--every', 5));
    stills = [];
    for (let f = S.start_f; f < S.start_f + S.dur_f; f += every) stills.push(f);
    if (stills[stills.length - 1] !== S.start_f + S.dur_f - 1) stills.push(S.start_f + S.dur_f - 1);
  }
  const full = !stills;
  const pageErrors = [];

  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pages = [];
  for (let i = 0; i < PAGES; i++) {
    const page = await browser.newPage({ viewport: { width: timeline.width, height: timeline.height } });
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('file://' + path.join(ROOT, 'renderer', 'index.html'));
    await page.evaluate((tl) => window.setup(tl), timeline);
    pages.push(page);
  }
  const missing = await pages[0].evaluate(() => window.missingScenes || []);
  const loadErrors = [...new Set(pageErrors)];
  if (loadErrors.length || missing.length) {
    const msg = [...loadErrors.map((e) => 'page error: ' + e), ...missing.map((m) => 'scene module missing: ' + m)].join('\n');
    if (full) throw new Error(msg);
    console.warn(msg + '\n(continuing: stills of other scenes still render)');
  }
  const grab = async (page, f, type) => {
    const url = await page.evaluate(([f, type]) => window.frame(f, type, 0.97), [f, type]);
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  };

  if (!full) {
    const outdir = path.resolve(arg('--outdir', path.join(BUILD, 'stills')));
    fs.mkdirSync(outdir, { recursive: true });
    for (let i = 0; i < stills.length; i += pages.length) {
      const batch = stills.slice(i, i + pages.length);
      const bufs = await Promise.all(batch.map((f, k) => grab(pages[k], f, 'image/png')));
      batch.forEach((f, k) => fs.writeFileSync(path.join(outdir, `f${String(f).padStart(4, '0')}.png`), bufs[k]));
    }
    console.log(`${stills.length} stills -> ${outdir}`);
    if (process.argv.includes('--sheet')) {
      const cols = 6, rows = Math.ceil(stills.length / cols);
      const label = (f) => {
        const S = timeline.scenes.find((s) => f >= s.start_f && f < s.start_f + s.dur_f);
        return `f${f} ${S.id} t=${((f - S.start_f) / timeline.fps).toFixed(2)}s`;
      };
      const inputs = [], chains = [];
      stills.forEach((f, k) => {
        inputs.push('-i', path.join(outdir, `f${String(f).padStart(4, '0')}.png`));
        chains.push(`[${k}:v]scale=270:480,drawtext=fontfile=${LABEL_FONT}:text='${label(f)}':x=6:y=6:fontsize=17:fontcolor=yellow:box=1:boxcolor=black@0.7[v${k}]`);
      });
      const pad = rows * cols - stills.length;
      for (let k = 0; k < pad; k++) chains.push(`color=c=0x333333:s=270x480:d=1[p${k}]`);
      const all = stills.map((_, k) => `[v${k}]`).join('') + Array.from({ length: pad }, (_, k) => `[p${k}]`).join('');
      const graph = chains.join(';') + `;${all}concat=n=${stills.length + pad}:v=1:a=0,tile=${cols}x${rows}:padding=4:color=0x333333`;
      const sheet = path.join(outdir, 'sheet.png');
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', graph, '-frames:v', '1', sheet], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('contact sheet failed');
      console.log(`sheet -> ${sheet}`);
    }
    await browser.close();
    return;
  }

  const out = path.join(BUILD, 'video.mp4');
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(timeline.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-r', String(timeline.fps), '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));

  const t0 = Date.now();
  for (let f = 0; f < timeline.frames; f += pages.length) {
    const batch = pages.map((p, i) => (f + i < timeline.frames ? grab(p, f + i, 'image/jpeg') : null));
    for (const buf of await Promise.all(batch)) if (buf) await write(buf);
    if (f % 150 < pages.length) console.log(`frame ${f}/${timeline.frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  if (pageErrors.length) throw new Error('page errors during render:\n' + [...new Set(pageErrors)].join('\n'));
  console.log(`video: ${out} (${timeline.frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
