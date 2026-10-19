// 2D-Ebene ueber der 3D-Szene: Untertitel, Zahlen-Karten, Labels, Koernung, Vignette.
// TikTok-Safe-Zones (1080x1920): oben 220 px, unten 420 px, rechts 140 px frei lassen.
import React, {useMemo} from 'react';
import {AbsoluteFill, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {cameraAt, clamp01, cuesOf, easeOut, project, toCamera, type Timeline, type Topic, type Word} from './core';
import type {Look} from './theme';

export const SAFE = {top: 220, bottom: 420, right: 140, left: 60};

// Woerter zu Gruppen von 2-4 Woertern, Umbruch nach Satzzeichen oder Pausen
type Group = {words: Word[]; s: number; e: number};
const groupWords = (words: Word[], fps: number): Group[] => {
	const groups: Group[] = [];
	let cur: Word[] = [];
	const flush = () => {
		if (cur.length) groups.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
		cur = [];
	};
	words.forEach((w, i) => {
		cur.push(w);
		const next = words[i + 1];
		const chars = cur.map((x) => x.w).join(' ').length;
		const punct = /[.,!?:;…–]$/.test(w.w);
		const pause = next ? next.s - w.e > fps * 0.3 : true;
		if (punct || pause || cur.length >= 4 || chars >= 17) flush();
	});
	flush();
	return groups;
};

export const Captions: React.FC<{tl: Timeline; look: Look}> = ({tl, look}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const groups = useMemo(() => groupWords(tl.words, fps), [tl.words, fps]);
	const gi = groups.findIndex((g, i) => f >= g.s - 2 && f < (groups[i + 1] ? Math.min(groups[i + 1].s - 2, g.e + fps * 0.8) : g.e + fps * 0.6));
	if (gi < 0) return null;
	const g = groups[gi];
	const enter = spring({frame: f - (g.s - 2), fps, config: {damping: 14, stiffness: 220, mass: 0.5}});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: SAFE.bottom + 70, paddingRight: SAFE.right - 40, paddingLeft: SAFE.left}}>
			<div style={{
				display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 22px', maxWidth: 820,
				transform: `translateY(${(1 - enter) * 24}px) scale(${0.94 + 0.06 * enter})`, opacity: enter,
				fontFamily: `${look.fontCaption}, sans-serif`, fontWeight: 800, fontSize: 78, lineHeight: 1.12, letterSpacing: -0.5,
			}}>
				{g.words.map((w, i) => {
					const active = f >= w.s && (i + 1 < g.words.length ? f < g.words[i + 1].s : true);
					const done = f >= w.s;
					const pop = active ? spring({frame: f - w.s, fps, config: {damping: 10, stiffness: 300, mass: 0.4}}) : 0;
					return (
						<span key={i} style={{
							color: active ? look.accent : look.text,
							opacity: done ? 1 : 0.55,
							transform: `scale(${1 + 0.07 * pop})`, display: 'inline-block',
							WebkitTextStroke: `10px ${look.ink}`, paintOrder: 'stroke fill',
							textShadow: `0 6px 18px ${look.ink}55`,
						}}>
							{w.w}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

// [card:Text|Untertitel] ... [card:-]   grosse Zahl oben im Bild
export const Cards: React.FC<{tl: Timeline; look: Look}> = ({tl, look}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const cards = cuesOf(tl, 'card');
	let idx = -1;
	for (let i = 0; i < cards.length; i++) if (cards[i].f <= f) idx = i;
	if (idx < 0) return null;
	const c = cards[idx];
	if (c.arg === '-') {
		// Ausblenden der vorherigen Karte
		const prev = cards[idx - 1];
		const out = clamp01((f - c.f) / 8);
		if (!prev || prev.arg === '-' || out >= 1) return null;
		return <Card text={prev.arg} sub={prev.extra} look={look} k={1 - out} />;
	}
	// Karte in Frame 0 ist sofort voll da (Hook + nahtloser Loop)
	const k = c.f === 0 ? 1 : spring({frame: f - c.f, fps, config: {damping: 12, stiffness: 180, mass: 0.6}});
	return <Card text={c.arg} sub={c.extra} look={look} k={k} />;
};

const Card: React.FC<{text: string; sub?: string; look: Look; k: number}> = ({text, sub, look, k}) => (
	<AbsoluteFill style={{alignItems: 'center', paddingTop: SAFE.top + 60, paddingRight: SAFE.right - 60}}>
		<div style={{
			transform: `scale(${0.82 + 0.18 * k}) translateY(${(1 - k) * -30}px)`, opacity: Math.min(1, k * 1.4),
			background: `${look.cardBg}E8`, borderRadius: 34, padding: '26px 52px 30px', textAlign: 'center',
			boxShadow: `0 18px 50px ${look.ink}40`,
		}}>
			<div style={{fontFamily: `${look.fontDisplay}, serif`, fontWeight: 900, fontSize: 132, lineHeight: 1, color: look.accent, letterSpacing: -2}}>{text}</div>
			{sub ? <div style={{fontFamily: `${look.fontCaption}, sans-serif`, fontWeight: 800, fontSize: 44, color: look.textDim, marginTop: 12}}>{sub}</div> : null}
		</div>
	</AbsoluteFill>
);

// [label:anker|Text]   Schild mit Linie an einem 3D-Punkt, lebt bis zum naechsten [shot:...] oder [label:-]
export const Labels: React.FC<{tl: Timeline; topic: Topic; look: Look}> = ({tl, topic, look}) => {
	const f = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const ends = tl.cues.filter((c) => c.type === 'shot' || (c.type === 'label' && c.arg === '-')).map((c) => c.f);
	const active = cuesOf(tl, 'label').filter((c) => c.arg !== '-' && c.f <= f && topic.anchors[c.arg]);
	const cam = toCamera(cameraAt(tl, topic, f), width / height);
	return (
		<AbsoluteFill>
			{active.map((c) => {
				const end = Math.min(...ends.filter((e) => e > c.f), Infinity);
				const out = clamp01((f - end) / 8);
				if (out >= 1) return null;
				const k = spring({frame: f - c.f, fps, config: {damping: 14, mass: 0.5}}) * (1 - out);
				const p = project(topic.anchors[c.arg], cam, width, height);
				if (!p.visible) return null;
				// [label:anker|Text|Richtung]  Richtung: l/r (links/rechts), d (nach unten), sonst automatisch
				const [text, dir = ''] = (c.extra ?? c.arg).split('|');
				const left = dir.includes('l') || (!dir.includes('r') && p.x > width * 0.55);
				const boxW = text.length * 25 + 76;
				let dx = left ? -220 : 200;
				// Schild bleibt in der Safe-Zone
				if (!left && p.x + dx + boxW > width - SAFE.right) dx = width - SAFE.right - boxW - p.x;
				if (left && p.x + dx - boxW < SAFE.left) dx = SAFE.left + boxW - p.x;
				const dy = dir.includes('d') ? 170 : -170;
				const lx = p.x + dx * easeOut(k);
				const ly = p.y + dy * easeOut(k);
				return (
					<React.Fragment key={c.f + c.arg}>
						<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
							<line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke={look.text} strokeWidth={5} opacity={k} />
							<circle cx={p.x} cy={p.y} r={12 * k} fill={look.accent} stroke={look.text} strokeWidth={5} />
						</svg>
						<div style={{
							position: 'absolute', left: lx, top: ly, transform: `translate(${left ? '-100%' : '0'}, -50%) scale(${k})`,
							transformOrigin: left ? 'right center' : 'left center',
							background: look.cardBg, color: look.text, borderRadius: 999, padding: '12px 30px',
							fontFamily: `${look.fontCaption}, sans-serif`, fontWeight: 800, fontSize: 46, whiteSpace: 'nowrap',
							border: `4px solid ${look.text}`,
						}}>
							{text}
						</div>
					</React.Fragment>
				);
			})}
		</AbsoluteFill>
	);
};

// Filmkoernung (Rausch-Kachel, pro Frame deterministisch verschoben) + Vignette.
// Kachel statt SVG-feTurbulence: auf der CPU um ein Vielfaches schneller.
export const Grain: React.FC<{look: Look}> = ({look}) => {
	const f = useCurrentFrame();
	const x = Math.floor(random(`gx${f}`) * 384);
	const y = Math.floor(random(`gy${f}`) * 384);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse 75% 60% at 50% 45%, transparent 55%, ${look.ink} 140%)`, opacity: look.vignette}} />
			<AbsoluteFill style={{
				backgroundImage: `url(${staticFile('tex/grain.png')})`, backgroundRepeat: 'repeat', backgroundPosition: `${x}px ${y}px`,
				opacity: look.grain * 2.2, mixBlendMode: 'overlay',
			}} />
		</AbsoluteFill>
	);
};

export const DraftBadge: React.FC<{look: Look}> = ({look}) => (
	<div style={{
		position: 'absolute', left: 40, top: 60, background: '#000000AA', color: '#fff', borderRadius: 14, padding: '10px 20px',
		fontFamily: `${look.fontCaption}, sans-serif`, fontWeight: 800, fontSize: 30,
	}}>
		ENTWURF · Platzhalterstimme (nicht Adam)
	</div>
);
