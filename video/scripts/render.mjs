// Video:   node scripts/render.mjs windrad [--look nacht]          -> ../out/windrad.mp4
// Stills:  node scripts/render.mjs windrad --stills 0,200,760 [--look nacht] [--scale 0.5] [--out dir]
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const ids = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const look = opt('--look');
const stills = opt('--stills');
const scale = Number(opt('--scale') || 1);
const outDir = opt('--out') || '../out';
const range = opt('--range') ? opt('--range').split('-').map(Number) : null; // z. B. 0-899
const muted = argv.includes('--muted');

// Cloud-Container hat Chromium hier; lokal (Mac) laedt Remotion sich selbst einen Browser
const cloudChrome = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browserExecutable = process.env.REMOTION_CHROME || (fs.existsSync(cloudChrome) ? cloudChrome : null);
// Ohne GPU rendert SwiftShader (CPU); mit GPU lokal schneller per "angle"
const chromiumOptions = {gl: process.env.REMOTION_GL || (browserExecutable === cloudChrome ? 'swangle' : 'angle')};

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
fs.mkdirSync(outDir, {recursive: true});
for (const id of ids) {
	const timeline = JSON.parse(fs.readFileSync(`public/timelines/${id}.json`, 'utf8'));
	const quality = {aa: !argv.includes('--no-aa'), shadows: !argv.includes('--no-shadows')};
	const inputProps = {id, timeline, look, overlays: !argv.includes('--no-overlays'), quality};
	const composition = await selectComposition({serveUrl, id: 'Explainer', inputProps, browserExecutable, chromiumOptions});
	const suffix = look ? `_${look}` : '';
	if (stills) {
		for (const frame of stills.split(',').map(Number)) {
			const output = `${outDir}/${id}${suffix}_${String(frame).padStart(4, '0')}.png`;
			await renderStill({composition, serveUrl, output, frame, inputProps, browserExecutable, chromiumOptions, scale});
			console.log('still:', output);
		}
		continue;
	}
	const out = opt('--file') || `${outDir}/${id}${suffix}.mp4`;
	const t0 = Date.now();
	await renderMedia({
		composition, serveUrl, codec: 'h264', outputLocation: out, inputProps, browserExecutable, chromiumOptions,
		concurrency: Number(process.env.CONCURRENCY || 4), crf: 18, scale, frameRange: range, muted,
		onProgress: ({progress}) => process.stdout.write(`\r${id}: ${(progress * 100).toFixed(0)} %   `),
	});
	console.log(`\nfertig: ${out} (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
}
