// Timeline (von scripts/build.py) + Cue-Logik + Kamera. Alles ist eine reine Funktion des Frames,
// damit Overlay (2D) und Szene (3D) exakt dieselbe Kamera sehen.
import {createContext, useContext} from 'react';
import * as THREE from 'three';
import type {Look} from './theme';

export type Word = {w: string; s: number; e: number};
export type Cue = {type: string; arg: string; extra?: string; f: number};
export type Timeline = {
	id: string;
	topic: string;
	title: string;
	fps: number;
	durationInFrames: number;
	look: Look['id'];
	draftVoice: boolean;
	voice: {src: string; from: number}[];
	words: Word[];
	cues: Cue[];
	acts: {name: string; from: number; to: number}[];
	sfx: {src: string; from: number; volume: number; dur?: number}[];
};

export type V3 = [number, number, number];
export type Shot = {pos: V3; target: V3; fov?: number; orbit?: number; dur?: number};
export type Topic = {
	id: string;
	shots: Record<string, Shot>;
	anchors: Record<string, V3>; // Label-Ankerpunkte
	startShot: string;
	Scene: React.FC;
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
	const t = clamp01(x);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const cuesOf = (tl: Timeline, type: string) => tl.cues.filter((c) => c.type === type);
export const cueFrame = (tl: Timeline, type: string, arg: string) => {
	const c = tl.cues.find((x) => x.type === type && x.arg === arg);
	return c ? c.f : Infinity;
};

// Ein-/Aus-Schalter wie [xray:on] ... [xray:off], weich ueberblendet
export const toggle = (tl: Timeline, type: string, f: number, fade = 15) => {
	let v = 0;
	for (const c of cuesOf(tl, type)) {
		if (c.f > f) break;
		// In Frame 0 sofort voll an, sonst passt der Loop-Uebergang nicht
		const p = c.f === 0 ? 1 : clamp01((f - c.f) / fade);
		v = c.arg === 'off' || c.arg === '-' ? v * (1 - p) : v + (1 - v) * p;
	}
	return ease(v);
};

// Hervorhebung: [hl:teil] gilt bis zum naechsten [hl:...]
export const highlight = (tl: Timeline, part: string, f: number, fade = 8) => {
	const hs = cuesOf(tl, 'hl');
	let v = 0;
	for (let i = 0; i < hs.length; i++) {
		const c = hs[i];
		const end = i + 1 < hs.length ? hs[i + 1].f : Infinity;
		if (!c.arg.split('+').includes(part)) continue;
		if (f < c.f) continue;
		const fadeIn = clamp01((f - c.f) / fade);
		const fadeOut = f >= end ? 1 - clamp01((f - end) / fade) : 1;
		v = Math.max(v, Math.min(fadeIn, fadeOut));
	}
	return ease(v);
};
export const anyHighlight = (tl: Timeline, f: number) => {
	const hs = cuesOf(tl, 'hl').filter((c) => c.f <= f);
	return hs.length > 0 && hs[hs.length - 1].arg !== '-';
};

// Seit wann laeuft ein Effekt [fx:name], in Frames (negativ = noch nicht)
export const since = (tl: Timeline, name: string, f: number) => f - cueFrame(tl, 'fx', name);

// Kamera ---------------------------------------------------------------
export type Pose = {pos: V3; target: V3; fov: number};
const DEFAULT_FOV = 35;

const shotPose = (shot: Shot, t: number, fps: number): Pose => {
	let pos = shot.pos;
	if (shot.orbit) {
		const a = ((shot.orbit * Math.PI) / 180) * (t / fps);
		const dx = pos[0] - shot.target[0];
		const dz = pos[2] - shot.target[2];
		pos = [shot.target[0] + dx * Math.cos(a) - dz * Math.sin(a), pos[1], shot.target[2] + dx * Math.sin(a) + dz * Math.cos(a)];
	}
	return {pos, target: shot.target, fov: shot.fov ?? DEFAULT_FOV};
};

export const cameraAt = (tl: Timeline, topic: Topic, f: number): Pose => {
	const cues = cuesOf(tl, 'shot').filter((c) => topic.shots[c.arg]);
	let pose = shotPose(topic.shots[topic.startShot], f, tl.fps);
	let prevStart = 0;
	let prevShot = topic.shots[topic.startShot];
	for (const c of cues) {
		if (c.f > f) break;
		const shot = topic.shots[c.arg];
		const dur = Number(c.extra) || shot.dur || 36;
		const from = shotPose(prevShot, c.f - prevStart, tl.fps);
		const to = shotPose(shot, f - c.f, tl.fps);
		const p = ease((f - c.f) / dur);
		pose = {pos: lerp3(from.pos, to.pos, p), target: lerp3(from.target, to.target, p), fov: lerp(from.fov, to.fov, p)};
		// Wird ein Uebergang unterbrochen, startet der naechste vom aktuellen Zwischenstand
		prevShot = p < 1 ? {pos: pose.pos, target: pose.target, fov: pose.fov} : shot;
		prevStart = p < 1 ? f : c.f;
	}
	// Leichtes Atmen der Kamera, periodisch ueber die Videolaenge (Loop bleibt nahtlos)
	const w = (2 * Math.PI * f) / tl.durationInFrames;
	const breathe: V3 = [Math.sin(w * 7) * 0.04, Math.sin(w * 5 + 1) * 0.03, Math.cos(w * 6) * 0.04];
	return {...pose, pos: [pose.pos[0] + breathe[0], pose.pos[1] + breathe[1], pose.pos[2] + breathe[2]]};
};

export const toCamera = (pose: Pose, aspect: number) => {
	const cam = new THREE.PerspectiveCamera(pose.fov, aspect, 0.05, 600);
	cam.position.set(...pose.pos);
	cam.lookAt(...pose.target);
	cam.updateMatrixWorld();
	cam.updateProjectionMatrix();
	return cam;
};

export const project = (p: V3, cam: THREE.PerspectiveCamera, w: number, h: number) => {
	const v = new THREE.Vector3(...p).project(cam);
	return {x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, visible: v.z < 1};
};

export type SceneState = {tl: Timeline; topic: Topic; look: Look; f: number};
export const SceneCtx = createContext<SceneState | null>(null);
export const useScene = () => useContext(SceneCtx)!;
