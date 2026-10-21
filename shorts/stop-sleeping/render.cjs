// Render build/timeline.json to build/video.mp4 (silent) with headless Chromium.
//   node render.cjs                 full render
//   node render.cjs --stills 0,45   write build/stills/f0000.png ... instead
// Frames are spread over several pages; each frame is a pure function of its index.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BUILD = path.join(ROOT, 'build');
const PAGES = Number(process.env.RENDER_PAGES || 3);

async function main() {
  const timeline = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));
  const stillsArg = process.argv.indexOf('--stills');
  const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;

  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pages = [];
  for (let i = 0; i < (stills ? 1 : PAGES); i++) {
    const page = await browser.newPage({ viewport: { width: timeline.width, height: timeline.height } });
    page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
    await page.goto('file://' + path.join(ROOT, 'renderer', 'index.html'));
    await page.evaluate((tl) => window.setup(tl), timeline);
    pages.push(page);
  }
  const grab = async (page, f, type) => {
    const url = await page.evaluate(([f, type]) => window.frame(f, type, 0.97), [f, type]);
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  };

  if (stills) {
    fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
    for (const f of stills) {
      const file = path.join(BUILD, 'stills', `f${String(f).padStart(4, '0')}.png`);
      fs.writeFileSync(file, await grab(pages[0], f, 'image/png'));
      console.log(file);
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
  console.log(`video: ${out} (${timeline.frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
