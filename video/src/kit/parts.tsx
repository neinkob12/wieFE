// Wiederverwendbare 3D-Bausteine: Material mit Hervorhebung/Roentgen, Welt (Insel, Huegel, Baeume, Wolken),
// Figuren, Haeuser, Strommasten, Energie-Fluss. Neue Themen setzen sich zum groessten Teil hieraus zusammen.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {highlight, toggle, useScene, type V3} from './core';

const tmp = new THREE.Color();
const mix = (a: string, b: string, t: number) => '#' + tmp.set(a).lerp(new THREE.Color(b), t).getHexString();

// Standard-Material. part: wird bei [hl:part] in Akzentfarbe getaucht. xray: wird bei [xray:on] glasig.
export const Mat: React.FC<{
	c: string;
	part?: string;
	xray?: string; // Name des Roentgen-Schalters, z. B. "xray"
	xrayMin?: number; // Rest-Deckkraft im Roentgen-Modus
	emissive?: string;
	glow?: number;
	side?: THREE.Side;
}> = ({c, part, xray, xrayMin = 0.14, emissive, glow = 0, side}) => {
	const {tl, f, look} = useScene();
	const hl = part ? highlight(tl, part, f) : 0;
	const pulse = hl > 0 ? 0.5 + 0.5 * Math.sin(f / 5) : 0;
	const x = xray ? toggle(tl, xray, f, 18) : 0;
	const color = mix(c, look.accent, hl * 0.92);
	const opacity = 1 - x * (1 - xrayMin);
	return (
		<meshStandardMaterial
			color={x > 0 ? mix(color, look.glass, x * 0.6) : color}
			flatShading={look.flat}
			roughness={look.roughness}
			metalness={0}
			emissive={emissive ?? look.accent}
			emissiveIntensity={emissive ? glow : hl * (0.18 + 0.12 * pulse)}
			transparent={opacity < 0.999}
			opacity={opacity}
			depthWrite={opacity > 0.5}
			side={side ?? (x > 0 ? THREE.DoubleSide : THREE.FrontSide)}
		/>
	);
};

// Unbeleuchtetes "Leucht"-Material fuer Strom, Wasser, Funken
export const Glow: React.FC<{c?: string; opacity?: number}> = ({c, opacity = 1}) => {
	const {look} = useScene();
	return <meshBasicMaterial color={c ?? look.energy} transparent={opacity < 1} opacity={opacity} toneMapped={false} />;
};

// Kanten-Linien fuer Roentgen-Huellen
export const XrayEdges: React.FC<{geometry: THREE.BufferGeometry; xray: string}> = ({geometry, xray}) => {
	const {tl, f, look} = useScene();
	const x = toggle(tl, xray, f, 18);
	const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 25), [geometry]);
	if (x <= 0.01) return null;
	return (
		<lineSegments geometry={edges}>
			<lineBasicMaterial color={look.glow ? look.glass : look.ink} transparent opacity={x * 0.55} />
		</lineSegments>
	);
};

// Licht + Nebel je Look
export const Lights: React.FC<{shadowSize?: number; center?: V3}> = ({shadowSize = 34, center = [0, 0, 0]}) => {
	const {look} = useScene();
	return (
		<>
			<hemisphereLight args={[look.hemiSky, look.hemiGround, look.ambient]} />
			<ambientLight intensity={look.ambient * 0.5} />
			<directionalLight
				position={[center[0] + 18, center[1] + 30, center[2] + 14]}
				intensity={look.sun}
				color={look.sunColor}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-bias={-0.0004}
				shadow-normalBias={0.02}
				shadow-camera-left={-shadowSize}
				shadow-camera-right={shadowSize}
				shadow-camera-top={shadowSize}
				shadow-camera-bottom={-shadowSize}
				shadow-camera-near={1}
				shadow-camera-far={120}
			/>
			<fog attach="fog" args={[look.fog, 35, 150]} />
		</>
	);
};

// Diorama-Insel: Wiese oben, Erdschichten an der Kante
export const Island: React.FC<{r?: number}> = ({r = 46}) => {
	const {look} = useScene();
	return (
		<group>
			<mesh position={[0, -0.25, 0]} receiveShadow>
				<cylinderGeometry args={[r, r, 0.5, 40]} />
				<Mat c={look.ground} />
			</mesh>
			<mesh position={[0, -1.6, 0]}>
				<cylinderGeometry args={[r - 0.2, r - 1.2, 2.2, 40]} />
				<Mat c={look.earth} />
			</mesh>
			<mesh position={[0, -3.2, 0]}>
				<cylinderGeometry args={[r - 1.2, r - 4, 1.2, 40]} />
				<Mat c={look.earthDark} />
			</mesh>
		</group>
	);
};

export const Hill: React.FC<{p: V3; s: V3; alt?: boolean}> = ({p, s, alt}) => {
	const {look} = useScene();
	return (
		<mesh position={p} scale={s} receiveShadow castShadow>
			<icosahedronGeometry args={[1, 1]} />
			<Mat c={alt ? look.groundAlt : look.ground} />
		</mesh>
	);
};

export const Tree: React.FC<{p: V3; s?: number; alt?: boolean}> = ({p, s = 1, alt}) => {
	const {look} = useScene();
	return (
		<group position={p} scale={s}>
			<mesh position={[0, 0.25, 0]} castShadow>
				<cylinderGeometry args={[0.08, 0.1, 0.5, 5]} />
				<Mat c={look.earthDark} />
			</mesh>
			<mesh position={[0, 1.05, 0]} castShadow>
				<coneGeometry args={[0.55, 1.5, 6]} />
				<Mat c={alt ? look.treeAlt : look.tree} />
			</mesh>
		</group>
	);
};

// Instancing: viele gleiche Teile in einem Zeichenaufruf (auf der CPU-Grafik der groesste Zeitgewinn)
const M4 = new THREE.Matrix4();
const Q0 = new THREE.Quaternion();
const C0 = new THREE.Color();
type Inst = {p: V3; s: number | V3; color?: string};
const useInstances = (ref: React.RefObject<THREE.InstancedMesh>, items: Inst[]) => {
	useLayoutEffect(() => {
		const mesh = ref.current;
		if (!mesh) return;
		items.forEach((it, i) => {
			const s = typeof it.s === 'number' ? [it.s, it.s, it.s] : it.s;
			M4.compose(new THREE.Vector3(...it.p), Q0, new THREE.Vector3(...s));
			mesh.setMatrixAt(i, M4);
			if (it.color) mesh.setColorAt(i, C0.set(it.color));
		});
		mesh.count = items.length;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	});
};

// Waldstueck aus zufaellig verteilten Baeumen (deterministisch per seed)
export const Forest: React.FC<{c: V3; r: number; n: number; seed: string}> = ({c, r, n, seed}) => {
	const {look} = useScene();
	const trunks = useRef<THREE.InstancedMesh>(null);
	const crowns = useRef<THREE.InstancedMesh>(null);
	const trees = Array.from({length: n}).map((_, i) => {
		const a = random(`${seed}a${i}`) * Math.PI * 2;
		const d = Math.sqrt(random(`${seed}d${i}`)) * r;
		return {x: c[0] + Math.cos(a) * d, z: c[2] + Math.sin(a) * d, s: 0.7 + random(`${seed}s${i}`) * 0.7, alt: random(`${seed}t${i}`) > 0.5};
	});
	useInstances(trunks, trees.map((t) => ({p: [t.x, c[1] + 0.25 * t.s, t.z], s: t.s})));
	useInstances(crowns, trees.map((t) => ({p: [t.x, c[1] + 1.05 * t.s, t.z], s: t.s, color: t.alt ? look.treeAlt : look.tree})));
	return (
		<group>
			<instancedMesh ref={trunks} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
				<cylinderGeometry args={[0.08, 0.1, 0.5, 5]} />
				<meshStandardMaterial color={look.earthDark} flatShading={look.flat} roughness={look.roughness} />
			</instancedMesh>
			<instancedMesh ref={crowns} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
				<coneGeometry args={[0.55, 1.5, 6]} />
				<meshStandardMaterial color="#ffffff" flatShading={look.flat} roughness={look.roughness} />
			</instancedMesh>
		</group>
	);
};

// Viele gleiche Kleinteile (Windstreifen, Tropfen, Funken) als ein Instanz-Mesh
export const Swarm: React.FC<{items: Inst[]; max: number; children: React.ReactNode}> = ({items, max, children}) => {
	const ref = useRef<THREE.InstancedMesh>(null);
	useInstances(ref, items);
	return (
		<instancedMesh ref={ref} args={[undefined, undefined, max]} frustumCulled={false}>
			{children}
		</instancedMesh>
	);
};

// Wolke aus Low-Poly-Kugeln, pendelt langsam (periodisch ueber die Videolaenge)
export const Cloud: React.FC<{p: V3; s?: number; seed: string}> = ({p, s = 1, seed}) => {
	const {look, f, tl} = useScene();
	const w = (2 * Math.PI * f) / tl.durationInFrames;
	const dx = Math.sin(w + random(seed) * 6) * 2.5;
	const blobs = useMemo(
		() => Array.from({length: 5}).map((_, i) => ({
			p: [(i - 2) * 0.9 + random(`${seed}x${i}`) * 0.4, random(`${seed}y${i}`) * 0.5, random(`${seed}z${i}`) * 0.6] as V3,
			r: 0.7 + random(`${seed}r${i}`) * 0.6 - Math.abs(i - 2) * 0.15,
		})),
		[seed],
	);
	return (
		<group position={[p[0] + dx, p[1], p[2]]} scale={s}>
			{blobs.map((b, i) => (
				<mesh key={i} position={b.p} scale={[b.r, b.r * 0.75, b.r]}>
					<icosahedronGeometry args={[1, 1]} />
					<Mat c={look.cloud} emissive={look.cloud} glow={look.glow ? 0.1 : 0.45} />
				</mesh>
			))}
		</group>
	);
};

// Gesichtslose Figur (Simplicissimus-Prinzip), ca. 1,8 m bei scale=1 und 1 Einheit = 10 m -> scale angeben
export const Figure: React.FC<{p: V3; rot?: number; s?: number; c?: string; lookUp?: number}> = ({p, rot = 0, s = 1, c, lookUp = 0}) => {
	const {look} = useScene();
	const col = c ?? look.ink;
	return (
		<group position={p} rotation={[0, rot, 0]} scale={s}>
			<mesh position={[0, 0.55, 0]} castShadow>
				<capsuleGeometry args={[0.2, 0.55, 3, 8]} />
				<Mat c={col} />
			</mesh>
			<mesh position={[0, 1.18 + lookUp * 0.02, lookUp * 0.04]} castShadow>
				<sphereGeometry args={[0.17, 10, 8]} />
				<Mat c={col} />
			</mesh>
		</group>
	);
};

export const House: React.FC<{p: V3; rot?: number; s?: number; lit?: number}> = ({p, rot = 0, s = 1, lit = 0}) => {
	const {look} = useScene();
	const roof = useMemo(() => {
		const g = new THREE.CylinderGeometry(0.01, 0.95, 0.7, 4, 1);
		g.rotateY(Math.PI / 4);
		return g;
	}, []);
	return (
		<group position={p} rotation={[0, rot, 0]} scale={s}>
			<mesh position={[0, 0.45, 0]} castShadow receiveShadow>
				<boxGeometry args={[1.3, 0.9, 1.3]} />
				<Mat c={look.house} />
			</mesh>
			<mesh position={[0, 1.25, 0]} geometry={roof} castShadow>
				<Mat c={look.roof} />
			</mesh>
			{[-0.3, 0.3].map((x) => (
				<mesh key={x} position={[x, 0.5, 0.66]}>
					<boxGeometry args={[0.22, 0.26, 0.02]} />
					<meshStandardMaterial color={mix(look.dark, look.window, lit)} emissive={look.window} emissiveIntensity={lit * 1.2} />
				</mesh>
			))}
		</group>
	);
};

// Strommast (Gittermast stark vereinfacht)
export const Pylon: React.FC<{p: V3; rot?: number; h?: number}> = ({p, rot = 0, h = 4}) => {
	const {look} = useScene();
	return (
		<group position={p} rotation={[0, rot, 0]}>
			<mesh position={[0, h / 2, 0]} castShadow>
				<cylinderGeometry args={[0.06, 0.3, h, 4]} />
				<Mat c={look.metal} />
			</mesh>
			<mesh position={[0, h * 0.92, 0]} castShadow>
				<boxGeometry args={[1.8, 0.07, 0.07]} />
				<Mat c={look.metal} />
			</mesh>
			<mesh position={[0, h * 0.75, 0]} castShadow>
				<boxGeometry args={[1.3, 0.06, 0.06]} />
				<Mat c={look.metal} />
			</mesh>
		</group>
	);
};

// Leitung zwischen zwei Punkten mit Durchhang
export const Wire: React.FC<{a: V3; b: V3; sag?: number; c?: string}> = ({a, b, sag = 0.6, c}) => {
	const {look} = useScene();
	const geo = useMemo(() => {
		const mid = new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2);
		const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), mid, new THREE.Vector3(...b));
		return new THREE.TubeGeometry(curve, 16, 0.025, 4, false);
	}, [a.join(), b.join(), sag]); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<mesh geometry={geo}>
			<Mat c={c ?? look.dark} />
		</mesh>
	);
};

// Energie-/Wasserfluss entlang eines Pfades. head(f) in 0..1 = wie weit der Fluss schon gekommen ist.
export const Flow: React.FC<{points: V3[]; head: number; n?: number; speed?: number; size?: number; c?: string}> = ({
	points, head, n = 60, speed = 0.004, size = 0.07, c,
}) => {
	const {f, look} = useScene();
	const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), [points]);
	if (head <= 0) return null;
	const dots: Inst[] = [];
	for (let i = 0; i < n; i++) {
		const u = (i / n + f * speed) % 1;
		if (u > head) continue;
		const p = curve.getPointAt(u);
		dots.push({p: [p.x, p.y, p.z], s: size * Math.min(1, (head - u) * 20)});
	}
	return (
		<group>
			<Swarm items={dots} max={n}>
				<icosahedronGeometry args={[1, 0]} />
				<Glow c={c} />
			</Swarm>
			{look.glow ? (
				<Swarm items={dots.map((d) => ({p: d.p, s: (d.s as number) * 2.6}))} max={n}>
					<sphereGeometry args={[1, 8, 6]} />
					<meshBasicMaterial color={c ?? look.energy} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
				</Swarm>
			) : null}
		</group>
	);
};

// Kleine Zahnrad-Geometrie (extrudiert), fuer Getriebe, Uhren, Motoren
export const gearGeometry = (r: number, teeth: number, depth: number, tooth = 0.18) => {
	const s = new THREE.Shape();
	const steps = teeth * 4;
	for (let i = 0; i <= steps; i++) {
		const a = (i / steps) * Math.PI * 2;
		const k = i % 4;
		const rr = k === 1 || k === 2 ? r * (1 + tooth) : r;
		const x = Math.cos(a) * rr;
		const y = Math.sin(a) * rr;
		if (i === 0) s.moveTo(x, y);
		else s.lineTo(x, y);
	}
	const hole = new THREE.Path();
	hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
	s.holes.push(hole);
	const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false});
	g.translate(0, 0, -depth / 2);
	return g;
};
