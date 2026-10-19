// Wiederverwendbare 3D-Bausteine: Material mit Hervorhebung/Roentgen, Licht + Umgebung, Himmel, Welt
// (Insel, Huegel, Wald, Felder, Strasse mit Autos), Figuren, Haeuser, Gittermasten, Blinklichter, Energie-Fluss.
// Neue Themen setzen sich zum groessten Teil hieraus zusammen.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {random} from 'remotion';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {highlight, loopPeriod, toggle, useScene, type V3} from './core';

const tmp = new THREE.Color();
export const mix = (a: string, b: string, t: number) => '#' + tmp.set(a).lerp(new THREE.Color(b), t).getHexString();

// Standard-Material. part: wird bei [hl:part] in Akzentfarbe getaucht. xray: wird bei [xray:on] glasig.
export const Mat: React.FC<{
	c: string;
	part?: string;
	xray?: string; // Name des Roentgen-Schalters, z. B. "xray"
	xrayMin?: number; // Rest-Deckkraft im Roentgen-Modus
	emissive?: string;
	glow?: number;
	metal?: number;
	rough?: number;
	side?: THREE.Side;
}> = ({c, part, xray, xrayMin = 0.14, emissive, glow = 0, metal = 0, rough, side}) => {
	const {tl, f, look} = useScene();
	const hl = part ? highlight(tl, part, f) : 0;
	const pulse = hl > 0 ? 0.5 + 0.5 * Math.sin(f / 4) : 0;
	const x = xray ? toggle(tl, xray, f, 12) : 0;
	const color = mix(c, look.highlight, hl * 0.92);
	const opacity = 1 - x * (1 - xrayMin);
	return (
		<meshStandardMaterial
			color={x > 0 ? mix(color, look.glass, x * 0.6) : color}
			flatShading={look.flat}
			roughness={rough ?? look.roughness}
			metalness={metal * (1 - hl)}
			emissive={emissive ?? look.highlight}
			emissiveIntensity={emissive ? glow : hl * (0.35 + 0.2 * pulse)}
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

// Weicher Lichtschein (additiv), z. B. um Lampen, Blinklichter, Mond
export const Halo: React.FC<{p?: V3; r: number; c: string; opacity: number}> = ({p = [0, 0, 0], r, c, opacity}) =>
	opacity <= 0.005 ? null : (
		<mesh position={p} scale={r}>
			<sphereGeometry args={[1, 12, 8]} />
			<meshBasicMaterial color={c} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
		</mesh>
	);

// Kanten-Linien fuer Roentgen-Huellen
export const XrayEdges: React.FC<{geometry: THREE.BufferGeometry; xray: string; angle?: number}> = ({geometry, xray, angle = 25}) => {
	const {tl, f, look} = useScene();
	const x = toggle(tl, xray, f, 12);
	const edges = useMemo(() => new THREE.EdgesGeometry(geometry, angle), [geometry, angle]);
	if (x <= 0.01) return null;
	return (
		<lineSegments geometry={edges}>
			<lineBasicMaterial color={look.glow ? look.glass : look.ink} transparent opacity={x * 0.6} />
		</lineSegments>
	);
};

// Umgebungs-Reflexionen (einmal pro Seite berechnet): Metall glaenzt, Flaechen wirken weniger "Plastik"
const EnvMap: React.FC<{intensity: number}> = ({intensity}) => {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	useLayoutEffect(() => {
		if (!scene.environment) {
			const pm = new THREE.PMREMGenerator(gl);
			scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
			pm.dispose();
		}
		scene.environmentIntensity = intensity;
	}, [gl, scene, intensity]);
	return null;
};

// Licht + Nebel + Umgebung je Look
export const Lights: React.FC<{shadowSize?: number; center?: V3}> = ({shadowSize = 34, center = [0, 0, 0]}) => {
	const {look} = useScene();
	return (
		<>
			<EnvMap intensity={look.glow ? 0.22 : 0.35} />
			<hemisphereLight args={[look.hemiSky, look.hemiGround, look.ambient]} />
			<ambientLight intensity={look.ambient * 0.35} />
			<directionalLight
				position={[center[0] - 22, center[1] + 30, center[2] + 16]}
				intensity={look.sun}
				color={look.sunColor}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-bias={-0.0003}
				shadow-normalBias={0.02}
				shadow-camera-left={-shadowSize}
				shadow-camera-right={shadowSize}
				shadow-camera-top={shadowSize}
				shadow-camera-bottom={-shadowSize}
				shadow-camera-near={1}
				shadow-camera-far={120}
			/>
			{/* Gegenlicht fuer Konturen */}
			<directionalLight position={[center[0] + 20, center[1] + 8, center[2] - 30]} intensity={look.sun * 0.35} color={look.glass} />
			<fog attach="fog" args={[look.fog, 40, 150]} />
		</>
	);
};

// Himmel als Kuppel in der 3D-Szene (deckender Hintergrund, damit Lichtschein-Effekte sauber ueberblenden),
// nachts mit Sternen (ein Punktwolken-Aufruf) und Mond
export const Sky: React.FC<{moon?: V3}> = ({moon = [120, 140, -230]}) => {
	const {look} = useScene();
	const dome = useMemo(() => {
		const g = new THREE.SphereGeometry(420, 32, 20);
		const pos = g.attributes.position;
		const top = new THREE.Color(look.skyTop);
		const mid = new THREE.Color(look.skyBottom);
		const hor = new THREE.Color(look.fog);
		const cols: number[] = [];
		for (let i = 0; i < pos.count; i++) {
			const y = pos.getY(i) / 420;
			const c = y > 0.3 ? mid.clone().lerp(top, Math.min(1, (y - 0.3) / 0.6)) : hor.clone().lerp(mid, Math.max(0, (y + 0.02) / 0.32));
			cols.push(c.r, c.g, c.b);
		}
		g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
		return g;
	}, [look]);
	const stars = useMemo(() => {
		const pts: number[] = [];
		for (let i = 0; i < 900; i++) {
			const a = random(`sa${i}`) * Math.PI * 2;
			const e = 0.1 + random(`se${i}`) * 1.3;
			const r = 380;
			pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
		return g;
	}, []);
	return (
		<group>
			<mesh geometry={dome} renderOrder={-1}>
				<meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
			</mesh>
			{look.glow ? (
				<>
					<points geometry={stars}>
						<pointsMaterial color={look.textDim} size={2} sizeAttenuation={false} transparent opacity={0.7} fog={false} />
					</points>
					<mesh position={moon} scale={4.5}>
						<sphereGeometry args={[1, 24, 16]} />
						<meshBasicMaterial color="#E3EEEA" fog={false} toneMapped={false} />
					</mesh>
					<mesh position={moon} scale={9}>
						<sphereGeometry args={[1, 16, 12]} />
						<meshBasicMaterial color={look.glass} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
					</mesh>
				</>
			) : null}
		</group>
	);
};

// Diorama-Insel: Wiese oben, Erdschichten an der Kante
export const Island: React.FC<{r?: number}> = ({r = 46}) => {
	const {look} = useScene();
	return (
		<group>
			<mesh position={[0, -0.25, 0]} receiveShadow>
				<cylinderGeometry args={[r, r, 0.5, 72]} />
				<Mat c={look.ground} rough={0.95} />
			</mesh>
			<mesh position={[0, -1.6, 0]}>
				<cylinderGeometry args={[r - 0.2, r - 1.2, 2.2, 72]} />
				<Mat c={look.earth} rough={1} />
			</mesh>
			<mesh position={[0, -3.2, 0]}>
				<cylinderGeometry args={[r - 1.2, r - 4, 1.2, 72]} />
				<Mat c={look.earthDark} rough={1} />
			</mesh>
		</group>
	);
};

export const Hill: React.FC<{p: V3; s: V3; alt?: boolean}> = ({p, s, alt}) => {
	const {look} = useScene();
	return (
		<mesh position={p} scale={s} receiveShadow castShadow>
			<icosahedronGeometry args={[1, 3]} />
			<Mat c={alt ? look.groundAlt : look.ground} rough={0.95} />
		</mesh>
	);
};

// Instancing: viele gleiche Teile in einem Zeichenaufruf (auf der CPU-Grafik der groesste Zeitgewinn)
const M4 = new THREE.Matrix4();
const C0 = new THREE.Color();
export type Inst = {p: V3; s: number | V3; color?: string; rot?: V3};
const useInstances = (ref: React.RefObject<THREE.InstancedMesh>, items: Inst[]) => {
	useLayoutEffect(() => {
		const mesh = ref.current;
		if (!mesh) return;
		items.forEach((it, i) => {
			const s = typeof it.s === 'number' ? [it.s, it.s, it.s] : it.s;
			const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(it.rot ?? [0, 0, 0])));
			M4.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...s));
			mesh.setMatrixAt(i, M4);
			if (it.color) mesh.setColorAt(i, C0.set(it.color));
		});
		mesh.count = items.length;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	});
};

// Viele gleiche Kleinteile (Windstreifen, Tropfen, Funken, Rippen) als ein Instanz-Mesh
export const Swarm: React.FC<{items: Inst[]; max: number; shadow?: boolean; children: React.ReactNode}> = ({items, max, shadow, children}) => {
	const ref = useRef<THREE.InstancedMesh>(null);
	useInstances(ref, items);
	return (
		<instancedMesh ref={ref} args={[undefined, undefined, max]} frustumCulled={false} castShadow={shadow} receiveShadow={shadow}>
			{children}
		</instancedMesh>
	);
};

// Mischwald: Nadelbaeume (Kegel) und Laubbaeume (runde Krone), deterministisch per seed
export const Forest: React.FC<{c: V3; r: number; n: number; seed: string; conifer?: number}> = ({c, r, n, seed, conifer = 0.55}) => {
	const {look} = useScene();
	const trees = Array.from({length: n}).map((_, i) => {
		const a = random(`${seed}a${i}`) * Math.PI * 2;
		const d = Math.sqrt(random(`${seed}d${i}`)) * r;
		return {
			x: c[0] + Math.cos(a) * d, z: c[2] + Math.sin(a) * d, s: 0.6 + random(`${seed}s${i}`) * 0.8,
			pine: random(`${seed}p${i}`) < conifer, tint: mix(look.tree, look.treeAlt, random(`${seed}t${i}`)), rot: random(`${seed}r${i}`) * 6,
		};
	});
	const pines = trees.filter((t) => t.pine);
	const leafy = trees.filter((t) => !t.pine);
	return (
		<group>
			<Swarm items={trees.map((t) => ({p: [t.x, c[1] + 0.3 * t.s, t.z], s: t.s}))} max={n} shadow>
				<cylinderGeometry args={[0.06, 0.09, 0.6, 6]} />
				<meshStandardMaterial color={look.earthDark} roughness={1} />
			</Swarm>
			<Swarm items={pines.map((t) => ({p: [t.x, c[1] + 1.15 * t.s, t.z], s: [t.s, t.s * 1.15, t.s], color: t.tint, rot: [0, t.rot, 0]}))} max={n} shadow>
				<coneGeometry args={[0.5, 1.7, 9]} />
				<meshStandardMaterial color="#ffffff" roughness={0.9} flatShading={look.flat} />
			</Swarm>
			<Swarm items={leafy.map((t) => ({p: [t.x, c[1] + 0.95 * t.s, t.z], s: [t.s * 0.62, t.s * 0.55, t.s * 0.62], color: t.tint, rot: [0, t.rot, 0]}))} max={n} shadow>
				<icosahedronGeometry args={[1, 2]} />
				<meshStandardMaterial color="#ffffff" roughness={0.9} flatShading={look.flat} />
			</Swarm>
		</group>
	);
};

// Ackerflaechen mit Furchen (Streifen-Textur, einmal erzeugt)
const fieldTexture = (a: string, b: string) => {
	const cv = document.createElement('canvas');
	cv.width = 8;
	cv.height = 64;
	const ctx = cv.getContext('2d')!;
	for (let y = 0; y < 64; y += 8) {
		ctx.fillStyle = a;
		ctx.fillRect(0, y, 8, 5);
		ctx.fillStyle = b;
		ctx.fillRect(0, y + 5, 8, 3);
	}
	const t = new THREE.CanvasTexture(cv);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
};
export const Fields: React.FC<{items: {p: V3; w: number; d: number; rot: number; tone: number}[]}> = ({items}) => {
	const {look} = useScene();
	const tex = useMemo(
		() => [0, 1, 2].map((k) => fieldTexture(mix(look.groundAlt, look.earth, 0.25 + k * 0.22), mix(look.groundAlt, look.earthDark, 0.45 + k * 0.2))),
		[look],
	);
	return (
		<group>
			{items.map((it, i) => {
				const t = tex[it.tone % 3].clone();
				t.repeat.set(1, it.d * 1.6);
				t.needsUpdate = true;
				return (
					<mesh key={i} position={[it.p[0], 0.012 + i * 0.001, it.p[2]]} rotation={[-Math.PI / 2, 0, it.rot]} receiveShadow>
						<planeGeometry args={[it.w, it.d]} />
						<meshStandardMaterial map={t} roughness={1} />
					</mesh>
				);
			})}
		</group>
	);
};

// Strasse als flaches Band entlang eines Pfades, optional mit fahrenden Autos (loop-sicher)
export const Road: React.FC<{points: V3[]; width?: number; cars?: number; seed?: string}> = ({points, width = 0.5, cars = 0, seed = 'road'}) => {
	const {look, tl, f} = useScene();
	const {curve, geo, line} = useMemo(() => {
		const cv = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
		const n = 120;
		const pos: number[] = [];
		const idx: number[] = [];
		const mid: number[] = [];
		for (let i = 0; i <= n; i++) {
			const u = i / n;
			const p = cv.getPointAt(u);
			const tng = cv.getTangentAt(u);
			const side = new THREE.Vector3(-tng.z, 0, tng.x).normalize().multiplyScalar(width / 2);
			pos.push(p.x + side.x, 0.02, p.z + side.z, p.x - side.x, 0.02, p.z - side.z);
			if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
			if (i % 4 < 2) mid.push(p.x, 0.03, p.z);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		const lg = new THREE.BufferGeometry();
		lg.setAttribute('position', new THREE.Float32BufferAttribute(mid, 3));
		return {curve: cv, geo: g, line: lg};
	}, [points, width]);
	const per = loopPeriod(tl, 600);
	return (
		<group>
			<mesh geometry={geo} receiveShadow>
				<meshStandardMaterial color={mix(look.dark, look.metal, 0.25)} roughness={0.85} side={THREE.DoubleSide} />
			</mesh>
			<lineSegments geometry={line}>
				<lineBasicMaterial color={look.textDim} transparent opacity={0.35} />
			</lineSegments>
			{Array.from({length: cars}).map((_, i) => {
				const dir = i % 2 ? -1 : 1;
				const u0 = random(`${seed}c${i}`);
				const u = (((u0 + (dir * f) / per) % 1) + 1) % 1;
				const p = curve.getPointAt(u);
				const t = curve.getTangentAt(u).multiplyScalar(dir);
				const side = new THREE.Vector3(-t.z, 0, t.x).normalize().multiplyScalar(width * 0.22);
				const yaw = Math.atan2(t.x, t.z);
				const body = [look.objectAlt, look.roof, look.house][i % 3];
				return (
					<group key={i} position={[p.x - side.x, 0.08, p.z - side.z]} rotation={[0, yaw, 0]} scale={0.55}>
						<mesh position={[0, 0.05, 0]} castShadow>
							<boxGeometry args={[0.3, 0.14, 0.62]} />
							<Mat c={body} metal={0.4} rough={0.4} />
						</mesh>
						<mesh position={[0, 0.17, -0.04]}>
							<boxGeometry args={[0.26, 0.11, 0.32]} />
							<Mat c={look.dark} metal={0.2} rough={0.3} />
						</mesh>
						{[-0.1, 0.1].map((x) => (
							<React.Fragment key={x}>
								<mesh position={[x, 0.06, 0.315]}>
									<boxGeometry args={[0.06, 0.035, 0.01]} />
									<Glow c={look.window} />
								</mesh>
								<mesh position={[x, 0.06, -0.315]}>
									<boxGeometry args={[0.06, 0.03, 0.01]} />
									<Glow c="#FF4B5C" />
								</mesh>
							</React.Fragment>
						))}
						{look.glow ? <Halo p={[0, 0.06, 0.55]} r={0.28} c={look.window} opacity={0.12} /> : null}
					</group>
				);
			})}
		</group>
	);
};

// Wolke aus weichen Kugeln, pendelt langsam (periodisch ueber die Videolaenge)
export const Cloud: React.FC<{p: V3; s?: number; seed: string}> = ({p, s = 1, seed}) => {
	const {look, f, tl} = useScene();
	const w = (2 * Math.PI * f) / tl.durationInFrames;
	const dx = Math.sin(w + random(seed) * 6) * 2.5;
	const blobs = useMemo(
		() => Array.from({length: 6}).map((_, i) => ({
			p: [(i - 2.5) * 0.85 + random(`${seed}x${i}`) * 0.4, random(`${seed}y${i}`) * 0.5, random(`${seed}z${i}`) * 0.7] as V3,
			r: 0.7 + random(`${seed}r${i}`) * 0.6 - Math.abs(i - 2.5) * 0.12,
		})),
		[seed],
	);
	return (
		<group position={[p[0] + dx, p[1], p[2]]} scale={s}>
			{blobs.map((b, i) => (
				<mesh key={i} position={b.p} scale={[b.r, b.r * 0.7, b.r]}>
					<icosahedronGeometry args={[1, 2]} />
					<meshStandardMaterial color={look.cloud} emissive={look.cloud} emissiveIntensity={look.glow ? 0.15 : 0.45} roughness={1} transparent opacity={look.glow ? 0.9 : 1} />
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
				<capsuleGeometry args={[0.2, 0.55, 4, 12]} />
				<Mat c={col} />
			</mesh>
			<mesh position={[0, 1.18 + lookUp * 0.02, lookUp * 0.04]} castShadow>
				<sphereGeometry args={[0.17, 16, 12]} />
				<Mat c={col} />
			</mesh>
		</group>
	);
};

// Haus mit Satteldach, Schornstein, Tuer und Fenstern auf zwei Seiten. lit: 0..1 Fenster leuchten
export const House: React.FC<{p: V3; rot?: number; s?: number; lit?: number; floors?: number}> = ({p, rot = 0, s = 1, lit = 0, floors = 1}) => {
	const {look} = useScene();
	const h = 0.9 * floors;
	const roof = useMemo(() => {
		const g = new THREE.CylinderGeometry(0.8, 0.8, 1.42, 3, 1);
		g.rotateZ(Math.PI / 2);
		g.rotateX(-Math.PI / 2);
		g.scale(1, 0.62, 1);
		return g;
	}, []);
	const win = (pos: V3, ry: number, k: number) => (
		<mesh key={pos.join()} position={pos} rotation={[0, ry, 0]}>
			<boxGeometry args={[0.2, 0.24, 0.02]} />
			<meshStandardMaterial color={mix(look.dark, look.window, k)} emissive={look.window} emissiveIntensity={k * 1.6} toneMapped={false} />
		</mesh>
	);
	const wins: React.ReactNode[] = [];
	for (let fl = 0; fl < floors; fl++) {
		const y = 0.5 + fl * 0.9;
		const k = Math.max(0, Math.min(1, lit * 1.4 - fl * 0.25));
		wins.push(win([-0.32, y, 0.66], 0, k), win([0.32, y, 0.66], 0, fl === 0 ? 0 : k), win([0.66, y, 0.2], Math.PI / 2, k), win([0.66, y, -0.3], Math.PI / 2, k * 0.6));
	}
	return (
		<group position={p} rotation={[0, rot, 0]} scale={s}>
			<mesh position={[0, h / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[1.3, h, 1.3]} />
				<Mat c={look.house} rough={0.9} />
			</mesh>
			<mesh position={[0, h + 0.25, 0]} geometry={roof} castShadow>
				<Mat c={look.roof} rough={0.8} />
			</mesh>
			<mesh position={[0.35, h + 0.45, -0.25]} castShadow>
				<boxGeometry args={[0.16, 0.5, 0.16]} />
				<Mat c={look.roof} />
			</mesh>
			<mesh position={[0.32, 0.22, 0.66]}>
				<boxGeometry args={[0.2, 0.42, 0.02]} />
				<Mat c={look.roof} />
			</mesh>
			{wins}
			{look.glow && lit > 0 ? <Halo p={[0, 0.5, 0.9]} r={0.9} c={look.window} opacity={0.05 * lit} /> : null}
		</group>
	);
};

// Strassenlaterne
export const StreetLight: React.FC<{p: V3; on?: number}> = ({p, on = 1}) => {
	const {look} = useScene();
	return (
		<group position={p}>
			<mesh position={[0, 0.35, 0]}>
				<cylinderGeometry args={[0.015, 0.02, 0.7, 6]} />
				<Mat c={look.metal} metal={0.6} />
			</mesh>
			<mesh position={[0, 0.71, 0]}>
				<sphereGeometry args={[0.04, 10, 8]} />
				<Glow c={mix(look.dark, look.window, on)} />
			</mesh>
			{look.glow ? <Halo p={[0, 0.71, 0]} r={0.3} c={look.window} opacity={0.12 * on} /> : null}
		</group>
	);
};

// Rotes Hindernisfeuer (blinkt nachts synchron wie echte Windparks: 1 s an, 0,5 s aus, 1 s an, 1,5 s aus)
export const BlinkLight: React.FC<{p: V3; size?: number}> = ({p, size = 0.05}) => {
	const {look, tl, f} = useScene();
	const per = loopPeriod(tl, 4 * tl.fps);
	const ph = ((f % per) / per) * 4;
	const on = (ph < 1 || (ph >= 1.5 && ph < 2.5)) ? 1 : 0;
	return (
		<group position={p}>
			<mesh scale={size}>
				<sphereGeometry args={[1, 10, 8]} />
				<meshBasicMaterial color={on ? '#FF4B5C' : '#4B1321'} toneMapped={false} />
			</mesh>
			{look.glow ? <Halo r={size * 3.5} c="#FF4B5C" opacity={0.22 * on} /> : null}
		</group>
	);
};

// Gittermast aus Streben, zu einer Geometrie verschmolzen (ein Zeichenaufruf)
const strut = (a: THREE.Vector3, b: THREE.Vector3, t: number) => {
	const d = new THREE.Vector3().subVectors(b, a);
	const g = new THREE.BoxGeometry(t, d.length(), t);
	g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
	g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
	return g;
};
export const latticePylonGeometry = (h: number) => {
	const parts: THREE.BufferGeometry[] = [];
	const levels = 6;
	const half = (y: number) => 0.42 - (0.32 * y) / h;
	const corner = (y: number, i: number) => {
		const w = half(y);
		return new THREE.Vector3(i < 2 ? -w : w, y, i % 3 === 0 ? -w : w);
	};
	for (let l = 0; l < levels; l++) {
		const y0 = (l / levels) * h * 0.86;
		const y1 = ((l + 1) / levels) * h * 0.86;
		for (let i = 0; i < 4; i++) {
			const j = (i + 1) % 4;
			parts.push(strut(corner(y0, i), corner(y1, i), 0.035));
			parts.push(strut(corner(y0, i), corner(y1, j), 0.015));
			parts.push(strut(corner(y0, j), corner(y1, i), 0.015));
			parts.push(strut(corner(y1, i), corner(y1, j), 0.015));
		}
	}
	const top = h * 0.86;
	parts.push(strut(new THREE.Vector3(0, top, 0), new THREE.Vector3(0, h, 0), 0.04));
	for (const [y, w] of [[h * 0.8, 1.0], [h * 0.93, 0.7]] as const) {
		parts.push(strut(new THREE.Vector3(-w, y, 0), new THREE.Vector3(w, y, 0), 0.05));
		parts.push(strut(new THREE.Vector3(-w, y, 0), new THREE.Vector3(0, y + 0.25, 0), 0.02));
		parts.push(strut(new THREE.Vector3(w, y, 0), new THREE.Vector3(0, y + 0.25, 0), 0.02));
		for (const x of [-w * 0.9, w * 0.9]) parts.push(strut(new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y - 0.22, 0), 0.03));
	}
	return mergeGeometries(parts.map((g) => g.toNonIndexed()));
};
export const Pylon: React.FC<{p: V3; rot?: number; h?: number}> = ({p, rot = 0, h = 4}) => {
	const {look} = useScene();
	const geo = useMemo(() => latticePylonGeometry(h), [h]);
	return (
		<mesh geometry={geo} position={p} rotation={[0, rot, 0]} castShadow>
			<Mat c={look.metal} metal={0.5} rough={0.5} />
		</mesh>
	);
};

// Leitung zwischen zwei Punkten mit Durchhang
export const Wire: React.FC<{a: V3; b: V3; sag?: number; c?: string}> = ({a, b, sag = 0.6, c}) => {
	const {look} = useScene();
	const geo = useMemo(() => {
		const mid = new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2);
		const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), mid, new THREE.Vector3(...b));
		return new THREE.TubeGeometry(curve, 24, 0.012, 4, false);
	}, [a.join(), b.join(), sag]); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<mesh geometry={geo}>
			<Mat c={c ?? look.metal} metal={0.6} />
		</mesh>
	);
};

// Energie-/Wasserfluss entlang eines Pfades. head(f) in 0..1 = wie weit der Fluss schon gekommen ist.
export const Flow: React.FC<{points: V3[]; head: number; n?: number; speed?: number; size?: number; c?: string}> = ({
	points, head, n = 60, speed = 0.006, size = 0.07, c,
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
				<icosahedronGeometry args={[1, 1]} />
				<Glow c={c} />
			</Swarm>
			{look.glow ? (
				<Swarm items={dots.map((d) => ({p: d.p, s: (d.s as number) * 2.8}))} max={n}>
					<sphereGeometry args={[1, 10, 8]} />
					<meshBasicMaterial color={c ?? look.energy} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
				</Swarm>
			) : null}
		</group>
	);
};

// Zahnrad-Geometrie (extrudiert, mit Fase), fuer Getriebe, Uhren, Motoren
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
	hole.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true);
	s.holes.push(hole);
	const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: true, bevelThickness: depth * 0.08, bevelSize: r * 0.02, bevelSegments: 1, curveSegments: 6});
	g.translate(0, 0, -depth / 2);
	return g;
};
