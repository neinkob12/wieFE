// Thema: Wie funktioniert eigentlich ein Windrad?
// Massstab: 1 Einheit = 10 m. Nabe auf 15 (150 m), Rotor-Radius 8 (Durchmesser 160 m), Wind kommt aus +z.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {clamp01, easeOut, since, toggle, useScene, type Topic, type V3} from '../kit/core';
import {Cloud, Figure, Flow, Forest, gearGeometry, Hill, House, Island, Lights, Mat, Pylon, Swarm, Wire, XrayEdges} from '../kit/parts';

const HUB: V3 = [0, 15, 1.45];
const NAC_Y = 15;
const BLADE_LEN = 8;

// 10 U/min, leicht angepasst, damit nach der Videolaenge eine ganze Drittel-Umdrehung erreicht ist (nahtloser Loop)
const useRotor = () => {
	const {tl, f} = useScene();
	const base = (2 * Math.PI) / (6 * tl.fps);
	const third = (2 * Math.PI) / 3;
	const n = Math.max(1, Math.round((tl.durationInFrames * base) / third));
	const w = (n * third) / tl.durationInFrames;
	return w * f;
};

const bladeGeometry = () => {
	const s = new THREE.Shape();
	s.moveTo(0.35, -0.17);
	s.lineTo(1.6, -0.34);
	s.lineTo(4.5, -0.2);
	s.lineTo(BLADE_LEN, -0.05);
	s.lineTo(BLADE_LEN, 0.03);
	s.lineTo(4.5, 0.14);
	s.lineTo(1.6, 0.3);
	s.lineTo(0.35, 0.17);
	s.closePath();
	const g = new THREE.ExtrudeGeometry(s, {depth: 0.06, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1});
	g.translate(0, 0, -0.03);
	return g;
};

const Rotor: React.FC<{angle: number; detail?: boolean}> = ({angle, detail}) => {
	const {look, tl, f} = useScene();
	const blade = useMemo(bladeGeometry, []);
	const speed = toggle(tl, 'speed', f, 12);
	return (
		<group position={HUB} rotation={[0, 0, -angle]}>
			{[0, 1, 2].map((i) => (
				<group key={i} rotation={[0, 0, (i * 2 * Math.PI) / 3 + Math.PI / 2]}>
					<group rotation={[0.22, 0, 0]}>
						<mesh geometry={blade} castShadow>
							<Mat c={look.object} part={detail ? 'blatt' : undefined} />
						</mesh>
					</group>
					<mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
						<cylinderGeometry args={[0.16, 0.2, 0.5, 8]} />
						<Mat c={look.objectAlt} />
					</mesh>
					{detail && speed > 0.01 ? (
						// Geschwindigkeits-Spur hinter der Fluegelspitze
						<group>
							{[0, 1, 2].map((j) => (
								<mesh key={j} rotation={[0, 0, 0.03]}>
									<torusGeometry args={[BLADE_LEN - 0.12 - j * 0.45, 0.07 - j * 0.015, 3, 24, 0.75 - j * 0.2]} />
									<meshBasicMaterial color={look.text} transparent opacity={(0.9 - j * 0.25) * speed} />
								</mesh>
							))}
						</group>
					) : null}
				</group>
			))}
			<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]} scale={[1, 1.5, 1]} castShadow>
				<sphereGeometry args={[0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
				<Mat c={look.object} />
			</mesh>
		</group>
	);
};

// Gondel mit Innenleben: Welle -> Getriebe -> Generator -> Transformator
const Nacelle: React.FC<{angle: number; detail?: boolean}> = ({angle, detail}) => {
	const {look, tl, f} = useScene();
	const x = detail ? toggle(tl, 'xray', f, 18) : 0;
	const housing = useMemo(() => {
		const g = new THREE.CylinderGeometry(0.58, 0.5, 3.4, 8, 1);
		g.rotateX(Math.PI / 2);
		g.rotateZ(Math.PI / 8);
		return g;
	}, []);
	const bigGear = useMemo(() => gearGeometry(0.3, 22, 0.1), []);
	const pinion = useMemo(() => gearGeometry(0.11, 8, 0.1, 0.3), []);
	const gear2 = useMemo(() => gearGeometry(0.22, 16, 0.1), []);
	const pinion2 = useMemo(() => gearGeometry(0.08, 6, 0.1, 0.35), []);
	const r1 = 0.3 / 0.11;
	const r2 = 0.22 / 0.08;
	const gy1 = NAC_Y + 0.46; // Achse Stufe 1
	const hssY = gy1 - 0.34; // schnelle Welle
	const genRot = angle * r1 * r2 * 1.6;
	const genOn = clamp01(since(tl, 'generator', f) / 20);
	const lamp = x * 2.2;
	return (
		<group>
			{/* Huelle */}
			<mesh geometry={housing} position={[0, NAC_Y, -0.6]} castShadow={x < 0.3} receiveShadow>
				<Mat c={look.object} xray={detail ? 'xray' : undefined} />
			</mesh>
			{detail ? <group position={[0, NAC_Y, -0.6]}><XrayEdges geometry={housing} xray="xray" /></group> : null}
			{detail && x > 0.01 ? (
				<group>
					<pointLight position={[0.3, NAC_Y + 0.35, -0.6]} intensity={lamp} distance={5} decay={0} color={look.sunColor} />
					{/* Hauptwelle (langsam, wie der Rotor) */}
					<mesh position={[0, NAC_Y, 0.6]} rotation={[Math.PI / 2, angle, 0]}>
						<cylinderGeometry args={[0.11, 0.11, 1.3, 8]} />
						<Mat c={look.metal} part="welle" />
					</mesh>
					<mesh position={[0, NAC_Y, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[0.22, 0.22, 0.18, 10]} />
						<Mat c={look.dark} />
					</mesh>
					{/* Getriebe: zwei Stufen */}
					<group position={[0, NAC_Y, 0.05]}>
						<mesh geometry={bigGear} rotation={[0, 0, -angle]}>
							<Mat c={look.metal} part="getriebe" />
						</mesh>
						<mesh geometry={pinion} position={[0, 0.46, 0]} rotation={[0, 0, angle * r1 + 0.2]}>
							<Mat c={look.metal} part="getriebe" />
						</mesh>
					</group>
					<mesh position={[0, gy1, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[0.04, 0.04, 0.35, 6]} />
						<Mat c={look.metal} />
					</mesh>
					<group position={[0, 0, -0.3]}>
						<mesh geometry={gear2} position={[0, gy1, 0]} rotation={[0, 0, angle * r1]}>
							<Mat c={look.metal} part="getriebe" />
						</mesh>
						<mesh geometry={pinion2} position={[0, hssY, 0]} rotation={[0, 0, -angle * r1 * r2 + 0.3]}>
							<Mat c={look.metal} part="getriebe" />
						</mesh>
					</group>
					<mesh position={[0, NAC_Y - 0.36, -0.1]}>
						<boxGeometry args={[0.5, 0.08, 0.7]} />
						<Mat c={look.dark} />
					</mesh>
					{/* Schnelle Welle */}
					<mesh position={[0, hssY, -0.62]} rotation={[Math.PI / 2, genRot, 0]}>
						<cylinderGeometry args={[0.035, 0.035, 0.6, 6]} />
						<Mat c={look.metal} part="welle2" />
					</mesh>
					{/* Generator: aufgeschnittener Stator mit Kupferspulen, Laeufer mit Magneten */}
					<group position={[0, hssY, -1.25]}>
						<mesh rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.36, 0.36, 0.62, 14, 1, true, Math.PI * 1.025, Math.PI * 1.45]} />
							<Mat c={look.objectAlt} part="generator" side={THREE.DoubleSide} />
						</mesh>
						{Array.from({length: 12}).map((_, i) => {
							const a = (i / 12) * Math.PI * 2;
							const pulse = genOn * (0.5 + 0.5 * Math.sin(genRot * 4 - i * 2));
							return (
								<mesh key={i} position={[Math.cos(a) * 0.315, Math.sin(a) * 0.315, 0]} rotation={[0, 0, a]}>
									<boxGeometry args={[0.045, 0.06, 0.46]} />
									<meshStandardMaterial color={look.copper} emissive={look.energy} emissiveIntensity={pulse * 0.7} flatShading={look.flat} />
								</mesh>
							);
						})}
						<group rotation={[0, 0, genRot]}>
							<mesh rotation={[Math.PI / 2, 0, 0]}>
								<cylinderGeometry args={[0.16, 0.16, 0.55, 8]} />
								<Mat c={look.dark} />
							</mesh>
							{Array.from({length: 8}).map((_, i) => {
								const a = (i / 8) * Math.PI * 2;
								return (
									<mesh key={i} position={[Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0]} rotation={[0, 0, a]}>
										<boxGeometry args={[0.06, 0.11, 0.5]} />
										<Mat c={i % 2 ? look.magnetN : look.magnetS} />
									</mesh>
								);
							})}
						</group>
					</group>
					{/* Transformator */}
					<group position={[0, NAC_Y - 0.12, -2.0]}>
						<mesh>
							<boxGeometry args={[0.5, 0.5, 0.38]} />
							<Mat c={look.objectAlt} part="trafo" />
						</mesh>
						{[-0.15, 0, 0.15].map((dx) => (
							<mesh key={dx} position={[dx, 0.32, 0]}>
								<cylinderGeometry args={[0.035, 0.05, 0.16, 6]} />
								<Mat c={look.copper} part="trafo" />
							</mesh>
						))}
						{[-0.3, 0.3].map((dx) => (
							<mesh key={dx} position={[dx, 0, 0]}>
								<boxGeometry args={[0.08, 0.42, 0.3]} />
								<Mat c={look.metal} part="trafo" />
							</mesh>
						))}
					</group>
				</group>
			) : null}
			{/* Windmesser auf dem Dach */}
			<group position={[0, NAC_Y + 0.58, -1.8]}>
				<mesh position={[0, 0.2, 0]}>
					<cylinderGeometry args={[0.02, 0.02, 0.4, 4]} />
					<Mat c={look.metal} />
				</mesh>
				<group position={[0, 0.42, 0]} rotation={[0, angle * 6, 0]}>
					{[0, 1, 2].map((i) => (
						<mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.12, 0, Math.sin((i * 2 * Math.PI) / 3) * 0.12]}>
							<sphereGeometry args={[0.04, 6, 4]} />
							<Mat c={look.metal} />
						</mesh>
					))}
				</group>
			</group>
		</group>
	);
};

const Tower: React.FC<{detail?: boolean}> = ({detail}) => {
	const {look} = useScene();
	const geo = useMemo(() => new THREE.CylinderGeometry(0.24, 0.42, 14.5, 10, 1), []);
	return (
		<group>
			<mesh geometry={geo} position={[0, 7.25, 0]} castShadow receiveShadow>
				<Mat c={look.object} xray={detail ? 'xturm' : undefined} xrayMin={0.38} />
			</mesh>
			{detail ? <group position={[0, 7.25, 0]}><XrayEdges geometry={geo} xray="xturm" /></group> : null}
			<mesh position={[0, 0.06, 0]} receiveShadow>
				<cylinderGeometry args={[1.0, 1.1, 0.12, 8]} />
				<Mat c={look.objectAlt} />
			</mesh>
			<mesh position={[0, 0.3, 0.41]}>
				<boxGeometry args={[0.18, 0.32, 0.04]} />
				<Mat c={look.dark} />
			</mesh>
			{detail ? (
				// Kabel im Turm
				<mesh position={[0.1, 7.4, 0]}>
					<cylinderGeometry args={[0.05, 0.05, 14.2, 5]} />
					<Mat c={look.dark} part="kabel" />
				</mesh>
			) : null}
		</group>
	);
};

const Turbine: React.FC<{p?: V3; s?: number; phase?: number; yaw?: number; detail?: boolean}> = ({p = [0, 0, 0], s = 1, phase = 0, yaw = 0, detail}) => {
	const angle = useRotor() + phase;
	return (
		<group position={p} scale={s} rotation={[0, yaw, 0]}>
			<Tower detail={detail} />
			<Nacelle angle={angle} detail={detail} />
			<Rotor angle={angle} detail={detail} />
		</group>
	);
};

// Koelner Dom, stark vereinfacht, 157 m (Hoehenvergleich). Waechst bei [dom:on] aus dem Boden.
const Dom: React.FC<{p: V3}> = ({p}) => {
	const {look, tl, f} = useScene();
	const k = toggle(tl, 'dom', f, 26);
	if (k <= 0.001) return null;
	const c = look.objectAlt;
	const tower = (dx: number) => (
		<group position={[dx, 0, 0]}>
			<mesh position={[0, 3.5, 0]} castShadow>
				<boxGeometry args={[1.3, 7, 1.3]} />
				<Mat c={c} />
			</mesh>
			<mesh position={[0, 8.75, 0]} castShadow>
				<boxGeometry args={[1.0, 3.5, 1.0]} />
				<Mat c={c} />
			</mesh>
			<mesh position={[0, 13.1, 0]} castShadow>
				<coneGeometry args={[0.62, 5.2, 8]} />
				<Mat c={c} />
			</mesh>
		</group>
	);
	return (
		<group position={p} scale={[1, easeOut(k), 1]}>
			{tower(-0.95)}
			{tower(0.95)}
			<mesh position={[0, 2.2, -3.7]} castShadow>
				<boxGeometry args={[2.6, 4.4, 6]} />
				<Mat c={c} />
			</mesh>
			<mesh position={[0, 4.4 + 0.9, -3.7]} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1, 1]} castShadow>
				<cylinderGeometry args={[1, 1, 6, 3, 1]} />
				<Mat c={c} />
			</mesh>
			<mesh position={[0, 0.9, 0.66]}>
				<boxGeometry args={[0.6, 1.4, 0.05]} />
				<Mat c={look.dark} />
			</mesh>
		</group>
	);
};

// Wind als Luftstreifen, die auf den Rotor zustroemen
const Wind: React.FC = () => {
	const {tl, f, look} = useScene();
	const k = toggle(tl, 'wind', f, 15);
	if (k <= 0.01) return null;
	const streaks = Array.from({length: 46}).map((_, i) => {
		const x = (random(`wx${i}`) - 0.5) * 18;
		const y = 6 + random(`wy${i}`) * 18;
		const z = 16 - ((random(`wz${i}`) * 26 + f * 0.32) % 26);
		const near = Math.max(0, 1 - Math.abs(z - HUB[2]) / 4);
		const bend = Math.hypot(x, y - HUB[1]) < BLADE_LEN ? near * 0.5 : 0;
		return {p: [x + Math.sign(x || 1) * bend, y, z] as V3, s: 1};
	});
	return (
		<Swarm items={streaks} max={46}>
			<boxGeometry args={[0.06, 0.06, 2.2]} />
			<meshBasicMaterial color={look.air} transparent opacity={0.85 * k} />
		</Swarm>
	);
};

// Hoehen-Massstab neben dem Turm
const Measure: React.FC = () => {
	const {tl, f, look} = useScene();
	const k = toggle(tl, 'mass', f, 20);
	if (k <= 0.01) return null;
	const h = 15 * easeOut(k);
	return (
		<group position={[1.6, 0, HUB[2]]}>
			<mesh position={[0, h / 2, 0]}>
				<boxGeometry args={[0.06, h, 0.06]} />
				<meshBasicMaterial color={look.accent} />
			</mesh>
			{[0, h].map((y) => (
				<mesh key={y} position={[0, y, 0]}>
					<boxGeometry args={[0.6, 0.06, 0.06]} />
					<meshBasicMaterial color={look.accent} />
				</mesh>
			))}
		</group>
	);
};

const VILLAGE: {p: V3; rot: number}[] = [
	{p: [13, 0, -13], rot: 0.3}, {p: [15.5, 0, -11.5], rot: -0.2}, {p: [14.5, 0, -16], rot: 0.8},
	{p: [17.5, 0, -14.5], rot: 0.1}, {p: [11.5, 0, -16.5], rot: -0.5}, {p: [16.8, 0, -18], rot: 0.4},
];
const P1: V3 = [5, 0, -5];
const P2: V3 = [9.5, 0, -9.5];
const PH = 3.6;

const PATH_NAC: V3[] = [[0, 14.9, -1.3], [0, 14.95, -1.7], [0, 14.98, -2.0]];
const PATH_TOWER: V3[] = [[0, 15.2, -2.0], [0.05, 14.7, -1.0], [0.1, 14.3, 0], [0.1, 8, 0], [0.1, 0.8, 0], [0.6, 0.35, -0.3], [1.1, 0.3, -0.6]];
const PATH_GRID: V3[] = [[1.1, 0.3, -0.6], [3, 2.6, -3], [P1[0] + 0.85, PH * 0.92, P1[2]], [7.2, PH * 0.75, -7.2], [P2[0] + 0.85, PH * 0.92, P2[2]], [12, 2.2, -12], [13, 1.0, -13], [15.5, 1.0, -11.5], [14.5, 1, -16]];

const head = (since: number, dur: number) => clamp01(since / dur);

const Scene: React.FC = () => {
	const {tl, f, look} = useScene();
	const sGen = since(tl, 'generator', f);
	const sStrom = since(tl, 'strom', f);
	const sNetz = since(tl, 'netz', f);
	const lit = clamp01((sNetz - 55) / 20);
	return (
		<>
			<Lights shadowSize={30} />
			<Island r={48} />
			<Hill p={[-20, -1.5, -12]} s={[11, 4, 9]} alt />
			<Hill p={[22, -2, 6]} s={[12, 3.6, 10]} />
			<Hill p={[-6, -2.5, -30]} s={[18, 5, 10]} />
			<Hill p={[30, -2.5, -26]} s={[14, 5, 12]} alt />
			<Forest c={[-9, 0, 6]} r={4} n={14} seed="w1" />
			<Forest c={[7, 0, 9]} r={3} n={9} seed="w2" />
			<Forest c={[-16, 0, -4]} r={5} n={16} seed="w3" />
			<Forest c={[20, 0, -6]} r={4} n={10} seed="w4" />
			<Cloud p={[-14, 27, -10]} s={2.2} seed="c1" />
			<Cloud p={[16, 31, -22]} s={2.8} seed="c2" />
			<Cloud p={[4, 34, -40]} s={3.4} seed="c3" />
			<Cloud p={[-30, 24, -34]} s={2.6} seed="c4" />

			<Turbine detail />
			<Turbine p={[-24, 0, -20]} phase={1.1} />
			<Turbine p={[-6, 0, -40]} phase={2.3} />
			<Turbine p={[27, 0, -36]} phase={0.6} />
			<Turbine p={[40, 0, -12]} phase={1.7} />

			<Dom p={[-11, 0, 3]} />
			<Measure />
			<Wind />
			<Figure p={[1.3, 0, 1.8]} rot={-0.6} s={0.22} lookUp={1} />
			<Figure p={[12.2, 0, -11.6]} rot={0.4} s={0.22} />

			{/* Schaltschrank am Turmfuss, Masten, Dorf */}
			<mesh position={[1.1, 0.25, -0.6]} castShadow>
				<boxGeometry args={[0.45, 0.5, 0.3]} />
				<Mat c={look.objectAlt} part="kabel" />
			</mesh>
			<Pylon p={P1} rot={Math.PI / 4} h={PH} />
			<Pylon p={P2} rot={Math.PI / 4} h={PH} />
			<Wire a={[1.1, 0.5, -0.6]} b={[P1[0] + 0.6, PH * 0.92, P1[2] - 0.6]} sag={0.4} />
			<Wire a={[P1[0] + 0.6, PH * 0.92, P1[2] - 0.6]} b={[P2[0] + 0.6, PH * 0.92, P2[2] - 0.6]} />
			<Wire a={[P2[0] + 0.6, PH * 0.92, P2[2] - 0.6]} b={[13, 1.2, -13]} sag={0.4} />
			{VILLAGE.map((h, i) => (
				<House key={i} p={h.p} rot={h.rot} s={0.9} lit={clamp01(lit * 1.5 - i * 0.12)} />
			))}

			<Flow points={PATH_NAC} head={head(sGen, 30)} n={14} speed={0.012} size={0.035} />
			<Flow points={PATH_TOWER} head={head(sStrom, 70)} n={90} speed={0.0035} size={0.06} />
			<Flow points={PATH_GRID} head={head(sNetz, 55)} n={70} speed={0.005} size={0.09} />
			{look.glow ? <GroundGlow /> : null}
		</>
	);
};

// Nacht-Look: leichter Lichtschein der Haeuser auf dem Boden
const GroundGlow: React.FC = () => {
	const {tl, f, look} = useScene();
	const lit = clamp01((since(tl, 'netz', f) - 55) / 20);
	if (lit <= 0) return null;
	return (
		<mesh position={[14.5, 0.02, -14.5]} rotation={[-Math.PI / 2, 0, 0]}>
			<circleGeometry args={[6, 24]} />
			<meshBasicMaterial color={look.window} transparent opacity={0.12 * lit} blending={THREE.AdditiveBlending} depthWrite={false} />
		</mesh>
	);
};

export const windrad: Topic = {
	id: 'windrad',
	startShot: 'tip',
	shots: {
		tip: {pos: [5.5, 19.5, 10.5], target: [0, 18.8, 1.45], fov: 52},
		wide: {pos: [17, 6.5, 33], target: [0, 11, 0], fov: 40, orbit: 1.2},
		hoehe: {pos: [-4, 8, 38], target: [-5.2, 10, 1], fov: 46},
		blatt: {pos: [7.5, 11.5, 9.5], target: [0, 14, 1.45], fov: 46},
		gondel: {pos: [5.2, 17.2, 6.2], target: [0, 15, -0.5], fov: 34, orbit: 3},
		welle: {pos: [2.3, 15.9, 2.6], target: [0, 15, 0.5], fov: 42},
		getriebe: {pos: [2.6, 16.0, 1.4], target: [0, 15.2, -0.15], fov: 42},
		generator: {pos: [2.4, 16.1, -0.4], target: [0, 15.1, -1.3], fov: 44},
		trafo: {pos: [2.6, 16.2, -1.0], target: [0, 15.0, -2.0], fov: 44},
		turm: {pos: [9, 9, 18], target: [0, 8.5, 0], fov: 52},
		netz: {pos: [-2.5, 6.5, 6.5], target: [11, 0.5, -11], fov: 40},
	},
	anchors: {
		nabe: [1.6, 15, 1.45],
		dom: [-11, 15.7, 3],
		getriebe: [0, 15.42, -0.1],
		generator: [0, 15.45, -1.25],
		trafo: [0, 15.25, -2.0],
		netz: [14.5, 1.6, -14],
	},
	Scene,
};
