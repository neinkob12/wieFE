// Thema: Wie funktioniert eigentlich ein Windrad?
// Massstab: 1 Einheit = 10 m. Nabe auf 15 (150 m), Rotor-Radius 8 (Durchmesser 160 m), Wind kommt aus +z.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {clamp01, easeOut, since, toggle, useScene, type Topic, type V3} from '../kit/core';
import {
	BlinkLight, Cloud, Fields, Figure, Flow, Forest, gearGeometry, Glow, Halo, Hill, House, Island, Lights, Mat, Pylon, Road, Sky,
	StreetLight, Swarm, Wire, XrayEdges,
} from '../kit/parts';

const HUB: V3 = [0, 15, 1.55];
const NAC_Y = 15;
const NAC_Z = -0.55; // Mitte der Gondel, Laenge 3,6 (z -2,35 bis 1,25)
const TOWER_H = 14.4;
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

const smooth = (a: number, b: number, x: number) => {
	const t = clamp01((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

// Rotorblatt als Profil-Loft: runde Wurzel, NACA-artiges Tragflaechenprofil, Verwindung zur Spitze hin
const bladeGeometry = (r0 = 0.25, r1 = BLADE_LEN, inflate = 1, stations = 30, seg = 20) => {
	const pos: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i <= stations; i++) {
		const r = r0 + (r1 - r0) * (i / stations);
		const chord = r < 1.7 ? 0.34 + 0.32 * smooth(0.3, 1.7, r) : 0.66 - 0.54 * Math.pow((r - 1.7) / (BLADE_LEN - 1.7), 0.85);
		const thick = 0.12 + 0.75 * (1 - smooth(0.3, 2.4, r));
		const twist = 0.32 * (1 - r / BLADE_LEN);
		const roundK = 1 - smooth(0.3, 1.3, r);
		const ct = Math.cos(twist);
		const st = Math.sin(twist);
		for (let j = 0; j <= seg; j++) {
			const s = (j / seg) * Math.PI * 2;
			const cx = (1 + Math.cos(s)) / 2; // 1 = Hinterkante, 0 = Nase
			const sign = s <= Math.PI ? 1 : -1;
			const yt = 5 * thick * (0.2969 * Math.sqrt(cx) - 0.126 * cx - 0.3516 * cx ** 2 + 0.2843 * cx ** 3 - 0.1036 * cx ** 4);
			let y = (cx - 0.3) * chord;
			let z = (sign * yt + 0.03 * Math.sin(Math.PI * cx)) * chord;
			y = (y * (1 - roundK) + Math.cos(s) * 0.17 * roundK) * inflate;
			z = (z * (1 - roundK) + Math.sin(s) * 0.17 * roundK) * inflate;
			pos.push(r, y * ct - z * st, y * st + z * ct);
		}
	}
	for (let i = 0; i < stations; i++) {
		for (let j = 0; j < seg; j++) {
			const a = i * (seg + 1) + j;
			const b = a + seg + 1;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	}
	if (r1 >= BLADE_LEN - 1e-6) {
		const tip = pos.length / 3;
		pos.push(r1 + 0.04 * inflate, 0, 0);
		for (let j = 0; j < seg; j++) idx.push(stations * (seg + 1) + j, tip, stations * (seg + 1) + j + 1);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
};

const Rotor: React.FC<{angle: number; detail?: boolean}> = ({angle, detail}) => {
	const {look, tl, f} = useScene();
	const blade = useMemo(() => bladeGeometry(), []);
	// Rot-weisse Tagesmarkierung an den Fluegelspitzen (wie bei echten Anlagen in Deutschland)
	const stripes = useMemo(() => [bladeGeometry(BLADE_LEN - 1.9, BLADE_LEN - 1.3, 1.03, 6), bladeGeometry(BLADE_LEN - 0.65, BLADE_LEN, 1.04, 6)], []);
	const spinner = useMemo(() => {
		const pts: THREE.Vector2[] = [];
		for (let i = 0; i <= 16; i++) {
			const t = i / 16;
			pts.push(new THREE.Vector2(0.64 * Math.sqrt(1 - t) + 0.001, t * 1.15));
		}
		const g = new THREE.LatheGeometry(pts, 40);
		g.rotateX(Math.PI / 2);
		return g;
	}, []);
	const speed = toggle(tl, 'speed', f, 8);
	return (
		<group position={HUB} rotation={[0, 0, -angle]}>
			{[0, 1, 2].map((i) => (
				<group key={i} rotation={[0, 0, (i * 2 * Math.PI) / 3 + Math.PI / 2]}>
					<group rotation={[0.1, 0, 0]}>
						<mesh geometry={blade} castShadow>
							<Mat c={look.object} part={detail ? 'blatt' : undefined} side={THREE.DoubleSide} rough={0.42} />
						</mesh>
						{stripes.map((g, k) => (
							<mesh key={k} geometry={g}>
								<Mat c={look.signal} side={THREE.DoubleSide} rough={0.45} />
							</mesh>
						))}
					</group>
					<mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
						<cylinderGeometry args={[0.2, 0.22, 0.1, 28]} />
						<Mat c={look.metal} metal={0.7} rough={0.35} />
					</mesh>
					{detail && speed > 0.01 ? (
						// Geschwindigkeits-Spuren hinter der Fluegelspitze
						<group>
							{[0, 1, 2].map((j) => (
								<mesh key={j} rotation={[0, 0, 0.03]}>
									<torusGeometry args={[BLADE_LEN - 0.12 - j * 0.45, 0.05 - j * 0.012, 4, 40, 0.8 - j * 0.2]} />
									<meshBasicMaterial color={look.text} transparent opacity={(0.85 - j * 0.25) * speed} toneMapped={false} />
								</mesh>
							))}
						</group>
					) : null}
				</group>
			))}
			<mesh geometry={spinner} position={[0, 0, 0.1]} castShadow>
				<Mat c={look.object} rough={0.35} />
			</mesh>
			<mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.62, 0.62, 0.5, 40]} />
				<Mat c={look.objectAlt} rough={0.45} />
			</mesh>
		</group>
	);
};

// Planetenstufe: feststehender Hohlrad-Ring, umlaufender Planetentraeger, Sonnenrad in der Mitte
const PlanetStage: React.FC<{z: number; ring: number; sun: number; carrier: number; sunAngle: number}> = ({z, ring, sun, carrier, sunAngle}) => {
	const {look} = useScene();
	const planetR = (ring - sun) / 2 - 0.012;
	const orbit = sun + planetR + 0.012;
	const sunG = useMemo(() => gearGeometry(sun, 10, 0.12, 0.2), [sun]);
	const planetG = useMemo(() => gearGeometry(planetR, 12, 0.12, 0.2), [planetR]);
	return (
		<group position={[0, NAC_Y, z]}>
			<mesh>
				<torusGeometry args={[ring + 0.03, 0.04, 10, 48]} />
				<Mat c={look.metal} part="getriebe" metal={0.75} rough={0.35} />
			</mesh>
			<mesh geometry={sunG} rotation={[0, 0, -sunAngle]}>
				<Mat c={look.metal} part="getriebe" metal={0.75} rough={0.3} />
			</mesh>
			<group rotation={[0, 0, -carrier]}>
				{[0, 1, 2].map((i) => {
					const a = (i * 2 * Math.PI) / 3;
					return (
						<mesh key={i} geometry={planetG} position={[Math.cos(a) * orbit, Math.sin(a) * orbit, 0]} rotation={[0, 0, carrier * (ring / planetR)]}>
							<Mat c={look.objectAlt} part="getriebe" metal={0.6} rough={0.35} />
						</mesh>
					);
				})}
				<mesh position={[0, 0, -0.09]}>
					<cylinderGeometry args={[orbit + 0.05, orbit + 0.05, 0.03, 3]} />
					<Mat c={look.dark} metal={0.4} />
				</mesh>
			</group>
		</group>
	);
};

// Gondel mit Innenleben: Hauptwelle -> 2 Planetenstufen -> Bremse/Kupplung -> Generator -> Umrichter + Transformator
const Nacelle: React.FC<{angle: number; detail?: boolean}> = ({angle, detail}) => {
	const {look, tl, f} = useScene();
	const x = detail ? toggle(tl, 'xray', f, 12) : 0;
	const housing = useMemo(() => new RoundedBoxGeometry(1.15, 1.2, 3.6, 4, 0.22), []);
	const sun1 = angle * 4.6;
	const sun2 = sun1 * 2;
	const genOn = clamp01(since(tl, 'generator', f) / 12);
	const ribs = Array.from({length: 11}).map((_, i) => ({p: [0, 0, -1.95 + i * 0.065] as V3, s: 1}));
	const genRibs = Array.from({length: 14})
		.map((_, i) => (i / 14) * Math.PI * 2)
		.filter((a) => a < Math.PI * 0.6 || a > Math.PI * 1.15)
		.map((a) => ({p: [Math.cos(a) * 0.4, NAC_Y + Math.sin(a) * 0.4, -1.4] as V3, s: 1, rot: [0, 0, a] as V3}));
	return (
		<group>
			{/* Huelle */}
			<group position={[0, NAC_Y, NAC_Z]}>
				<mesh geometry={housing} castShadow={x < 0.3} receiveShadow>
					<Mat c={look.object} xray={detail ? 'xray' : undefined} rough={0.4} />
				</mesh>
				{detail ? <XrayEdges geometry={housing} xray="xray" angle={40} /> : null}
			</group>
			{/* Kuehler mit Rippen auf dem Dach */}
			<group position={[0, NAC_Y + 0.66, 0]}>
				<mesh position={[0, -0.03, -1.62]}>
					<boxGeometry args={[0.95, 0.06, 0.78]} />
					<Mat c={look.objectAlt} rough={0.5} />
				</mesh>
				<Swarm items={ribs} max={11}>
					<boxGeometry args={[0.9, 0.26, 0.018]} />
					<meshStandardMaterial color={look.metal} metalness={0.6} roughness={0.35} />
				</Swarm>
			</group>
			{/* Windmesser, Windfahne, Hindernisfeuer */}
			<group position={[0, NAC_Y + 0.6, -2.1]}>
				<mesh position={[0, 0.25, 0]}>
					<cylinderGeometry args={[0.018, 0.022, 0.5, 8]} />
					<Mat c={look.metal} metal={0.6} />
				</mesh>
				<group position={[0, 0.52, 0]} rotation={[0, angle * 8, 0]}>
					{[0, 1, 2].map((i) => (
						<mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.1, 0, Math.sin((i * 2 * Math.PI) / 3) * 0.1]}>
							<sphereGeometry args={[0.032, 10, 8, 0, Math.PI]} />
							<Mat c={look.metal} metal={0.5} side={THREE.DoubleSide} />
						</mesh>
					))}
				</group>
				<mesh position={[0.24, 0.35, -0.06]}>
					<boxGeometry args={[0.012, 0.09, 0.22]} />
					<Mat c={look.metal} />
				</mesh>
				<BlinkLight p={[0.38, 0.12, 0.1]} />
				<BlinkLight p={[-0.38, 0.12, 0.1]} />
			</group>
			{detail && x > 0.01 ? (
				<group>
					<pointLight position={[0.3, NAC_Y + 0.4, -0.5]} intensity={x * 2.4} distance={5} decay={0} color={look.textDim} />
					{/* Maschinenrahmen */}
					<mesh position={[0, NAC_Y - 0.47, -0.6]}>
						<boxGeometry args={[0.78, 0.1, 3.2]} />
						<Mat c={look.dark} metal={0.3} rough={0.6} />
					</mesh>
					{/* Hauptlager + Hauptwelle (dreht langsam wie der Rotor) */}
					<mesh position={[0, NAC_Y, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[0.3, 0.32, 0.4, 32]} />
						<Mat c={look.objectAlt} metal={0.4} rough={0.45} />
					</mesh>
					<group position={[0, NAC_Y, 0.72]} rotation={[0, 0, -angle]}>
						<mesh rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.13, 0.13, 0.95, 24]} />
							<Mat c={look.metal} part="welle" metal={0.8} rough={0.3} />
						</mesh>
						<mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
							<Mat c={look.metal} part="welle" metal={0.8} rough={0.3} />
						</mesh>
						{Array.from({length: 8}).map((_, i) => (
							<mesh key={i} position={[Math.cos((i * Math.PI) / 4) * 0.2, Math.sin((i * Math.PI) / 4) * 0.2, -0.38]}>
								<cylinderGeometry args={[0.02, 0.02, 0.05, 6]} />
								<Mat c={look.dark} />
							</mesh>
						))}
					</group>
					{/* Getriebe: aufgeschnittenes Gehaeuse, zwei Planetenstufen */}
					<mesh position={[0, NAC_Y, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[0.46, 0.42, 0.82, 36, 1, true, Math.PI * 1.025, Math.PI * 1.45]} />
						<Mat c={look.objectAlt} metal={0.3} rough={0.5} side={THREE.DoubleSide} />
					</mesh>
					<PlanetStage z={0.12} ring={0.36} sun={0.1} carrier={angle} sunAngle={sun1} />
					<PlanetStage z={-0.28} ring={0.3} sun={0.08} carrier={sun1} sunAngle={sun2} />
					{/* Schnelle Welle mit Bremsscheibe, Bremssattel und Kupplung */}
					<group position={[0, NAC_Y, -0.76]} rotation={[0, 0, -sun2]}>
						<mesh rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.045, 0.045, 0.52, 12]} />
							<Mat c={look.metal} part="welle2" metal={0.8} rough={0.3} />
						</mesh>
						<mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.2, 0.2, 0.025, 32]} />
							<Mat c={look.metal} part="welle2" metal={0.85} rough={0.25} />
						</mesh>
						<mesh position={[0.12, 0, 0.12]}>
							<boxGeometry args={[0.02, 0.06, 0.03]} />
							<Mat c={look.dark} />
						</mesh>
						<mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.09, 0.09, 0.07, 16]} />
							<Mat c={look.dark} metal={0.4} />
						</mesh>
					</group>
					<mesh position={[0, NAC_Y + 0.21, -0.64]}>
						<boxGeometry args={[0.09, 0.1, 0.08]} />
						<Mat c={look.signal} rough={0.5} />
					</mesh>
					{/* Generator: aufgeschnittener Stator mit Kuehlrippen und Kupferspulen, Laeufer mit Magneten */}
					<group position={[0, NAC_Y, -1.4]}>
						<mesh rotation={[Math.PI / 2, 0, 0]}>
							<cylinderGeometry args={[0.38, 0.38, 0.74, 40, 1, true, Math.PI * 1.025, Math.PI * 1.45]} />
							<Mat c={look.objectAlt} part="generator" metal={0.3} rough={0.45} side={THREE.DoubleSide} />
						</mesh>
						{Array.from({length: 12}).map((_, i) => {
							const a = (i / 12) * Math.PI * 2;
							const pulse = genOn * (0.5 + 0.5 * Math.sin(sun2 * 4 - i * 2));
							return (
								<mesh key={i} position={[Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0]} rotation={[0, 0, a]}>
									<boxGeometry args={[0.045, 0.06, 0.66]} />
									<meshStandardMaterial color={look.copper} metalness={0.7} roughness={0.35} emissive={look.energy} emissiveIntensity={pulse * 0.8} />
								</mesh>
							);
						})}
						<group rotation={[0, 0, -sun2]}>
							<mesh rotation={[Math.PI / 2, 0, 0]}>
								<cylinderGeometry args={[0.17, 0.17, 0.66, 24]} />
								<Mat c={look.dark} metal={0.5} rough={0.4} />
							</mesh>
							{Array.from({length: 8}).map((_, i) => {
								const a = (i / 8) * Math.PI * 2;
								return (
									<mesh key={i} position={[Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0]} rotation={[0, 0, a]}>
										<boxGeometry args={[0.06, 0.12, 0.62]} />
										<Mat c={i % 2 ? look.magnetN : look.magnetS} rough={0.4} />
									</mesh>
								);
							})}
						</group>
					</group>
					<Swarm items={genRibs} max={14}>
						<boxGeometry args={[0.04, 0.025, 0.7]} />
						<meshStandardMaterial color={look.objectAlt} metalness={0.4} roughness={0.45} />
					</Swarm>
					{/* Umrichter-Schrank */}
					<group position={[-0.3, NAC_Y - 0.05, -2.02]}>
						<mesh>
							<boxGeometry args={[0.3, 0.62, 0.38]} />
							<Mat c={look.objectAlt} rough={0.5} />
						</mesh>
						{[0.12, 0.05, -0.02].map((y) => (
							<mesh key={y} position={[0.152, y, 0.1]}>
								<boxGeometry args={[0.005, 0.02, 0.02]} />
								<Glow c={look.energy} />
							</mesh>
						))}
					</group>
					{/* Transformator mit Kuehlrippen und Durchfuehrungen */}
					<group position={[0.18, NAC_Y - 0.12, -2.02]}>
						<mesh>
							<boxGeometry args={[0.38, 0.5, 0.38]} />
							<Mat c={look.objectAlt} part="trafo" rough={0.5} />
						</mesh>
						{[-0.14, -0.07, 0, 0.07, 0.14].map((z) => (
							<mesh key={z} position={[0.23, 0, z]}>
								<boxGeometry args={[0.09, 0.42, 0.015]} />
								<Mat c={look.metal} part="trafo" metal={0.5} />
							</mesh>
						))}
						{[-0.11, 0, 0.11].map((dz) => (
							<mesh key={dz} position={[-0.05, 0.33, dz]}>
								<cylinderGeometry args={[0.025, 0.04, 0.16, 10]} />
								<Mat c={look.textDim} part="trafo" rough={0.3} />
							</mesh>
						))}
					</group>
					{/* Azimut: Drehkranz + Motoren, die die Gondel in den Wind drehen */}
					<mesh position={[0, TOWER_H + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
						<torusGeometry args={[0.3, 0.035, 10, 40]} />
						<Mat c={look.metal} metal={0.7} />
					</mesh>
					{[0, 1, 2, 3].map((i) => (
						<mesh key={i} position={[Math.cos(i * Math.PI / 2 + 0.6) * 0.38, TOWER_H + 0.2, Math.sin(i * Math.PI / 2 + 0.6) * 0.38]}>
							<cylinderGeometry args={[0.045, 0.045, 0.26, 12]} />
							<Mat c={look.dark} metal={0.4} />
						</mesh>
					))}
				</group>
			) : null}
		</group>
	);
};

const towerR = (y: number) => 0.48 - (0.22 * y) / TOWER_H;

const Tower: React.FC<{detail?: boolean}> = ({detail}) => {
	const {look} = useScene();
	const geo = useMemo(() => new THREE.CylinderGeometry(towerR(TOWER_H), towerR(0), TOWER_H, 48, 1), []);
	const band = useMemo(() => new THREE.CylinderGeometry(towerR(4.6) + 0.006, towerR(4.0) + 0.006, 0.6, 48, 1, true), []);
	return (
		<group>
			<mesh geometry={geo} position={[0, TOWER_H / 2, 0]} castShadow receiveShadow>
				<Mat c={look.object} xray={detail ? 'xturm' : undefined} xrayMin={0.38} rough={0.45} />
			</mesh>
			{detail ? <group position={[0, TOWER_H / 2, 0]}><XrayEdges geometry={geo} xray="xturm" angle={30} /></group> : null}
			{/* Roter Farbring bei 40 m (Tagesmarkierung) */}
			<mesh geometry={band} position={[0, 4.3, 0]}>
				<Mat c={look.signal} rough={0.5} />
			</mesh>
			{/* Flansche zwischen den Turmsegmenten */}
			{[2.9, 6.2, 9.4, 12.2].map((y) => (
				<mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<torusGeometry args={[towerR(y) + 0.004, 0.012, 6, 48]} />
					<Mat c={look.objectAlt} />
				</mesh>
			))}
			{/* Fundament, Schotterplatz, Tuer mit Treppe */}
			<mesh position={[0, 0.05, 0]} receiveShadow>
				<cylinderGeometry args={[1.1, 1.2, 0.1, 40]} />
				<Mat c={look.objectAlt} rough={0.9} />
			</mesh>
			<mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<circleGeometry args={[2.6, 40]} />
				<meshStandardMaterial color={look.metal} roughness={1} />
			</mesh>
			<group position={[0, 0, towerR(0.3) - 0.02]}>
				<mesh position={[0, 0.38, 0]}>
					<boxGeometry args={[0.16, 0.26, 0.05]} />
					<Mat c={look.dark} metal={0.4} />
				</mesh>
				{[0, 1, 2].map((i) => (
					<mesh key={i} position={[0, 0.13 + i * 0.05, 0.12 - i * 0.04]}>
						<boxGeometry args={[0.2, 0.025, 0.06]} />
						<Mat c={look.metal} metal={0.6} />
					</mesh>
				))}
			</group>
			{detail ? (
				// Kabel im Turm
				<mesh position={[0.12, 7.4, 0]}>
					<cylinderGeometry args={[0.045, 0.045, 14.0, 8]} />
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

// Koelner Dom, vereinfacht, 157 m (Hoehenvergleich). Waechst bei [dom:on] aus dem Boden.
const Dom: React.FC<{p: V3}> = ({p}) => {
	const {look, tl, f} = useScene();
	const k = toggle(tl, 'dom', f, 18);
	if (k <= 0.001) return null;
	const c = look.objectAlt;
	const tower = (dx: number) => (
		<group position={[dx, 0, 0]}>
			<mesh position={[0, 3.5, 0]} castShadow>
				<boxGeometry args={[1.3, 7, 1.3]} />
				<Mat c={c} rough={0.85} />
			</mesh>
			<mesh position={[0, 8.75, 0]} castShadow>
				<cylinderGeometry args={[0.55, 0.62, 3.5, 8]} />
				<Mat c={c} rough={0.85} />
			</mesh>
			<mesh position={[0, 13.1, 0]} castShadow>
				<coneGeometry args={[0.6, 5.2, 8]} />
				<Mat c={c} rough={0.85} />
			</mesh>
			{[-0.62, 0.62].map((x) => (
				<mesh key={x} position={[x, 7.4, 0.62]}>
					<coneGeometry args={[0.12, 0.8, 6]} />
					<Mat c={c} />
				</mesh>
			))}
		</group>
	);
	return (
		<group position={p} scale={[1, easeOut(k), 1]}>
			{tower(-0.95)}
			{tower(0.95)}
			<mesh position={[0, 2.2, -3.7]} castShadow>
				<boxGeometry args={[2.6, 4.4, 6]} />
				<Mat c={c} rough={0.85} />
			</mesh>
			<mesh position={[0, 4.4 + 0.9, -3.7]} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1, 1]} castShadow>
				<cylinderGeometry args={[1, 1, 6, 3, 1]} />
				<Mat c={look.dark} rough={0.7} />
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
	const k = toggle(tl, 'wind', f, 10);
	if (k <= 0.01) return null;
	const streaks = Array.from({length: 60}).map((_, i) => {
		const x = (random(`wx${i}`) - 0.5) * 18;
		const y = 6 + random(`wy${i}`) * 18;
		const z = 16 - ((random(`wz${i}`) * 26 + f * 0.5) % 26);
		const near = Math.max(0, 1 - Math.abs(z - HUB[2]) / 4);
		const bend = Math.hypot(x, y - HUB[1]) < BLADE_LEN ? near * 0.5 : 0;
		return {p: [x + Math.sign(x || 1) * bend, y, z] as V3, s: 1};
	});
	return (
		<Swarm items={streaks} max={60}>
			<boxGeometry args={[0.035, 0.035, 2.6]} />
			<meshBasicMaterial color={look.air} transparent opacity={0.8 * k} toneMapped={false} />
		</Swarm>
	);
};

// Hoehen-Massstab neben dem Turm
const Measure: React.FC = () => {
	const {tl, f, look} = useScene();
	const k = toggle(tl, 'mass', f, 14);
	if (k <= 0.01) return null;
	const h = 15 * easeOut(k);
	return (
		<group position={[1.6, 0, HUB[2]]}>
			<mesh position={[0, h / 2, 0]}>
				<boxGeometry args={[0.05, h, 0.05]} />
				<meshBasicMaterial color={look.accent} toneMapped={false} />
			</mesh>
			{[0, h].map((y) => (
				<mesh key={y} position={[0, y, 0]}>
					<boxGeometry args={[0.6, 0.05, 0.05]} />
					<meshBasicMaterial color={look.accent} toneMapped={false} />
				</mesh>
			))}
		</group>
	);
};

const MAIN_ROAD: V3[] = [[-46, 0, 17], [-28, 0, 13.5], [-14, 0, 12], [-2, 0, 12.5], [6, 0, 11], [12, 0, 6], [14.5, 0, -2], [14, 0, -9], [14.5, 0, -14], [16, 0, -22], [20, 0, -34]];
const ACCESS_ROAD: V3[] = [[1.4, 0, 1.6], [3.5, 0, 5.2], [6.2, 0, 8.6], [8.2, 0, 9.4]];
const FIELDS = [
	{p: [-20, 0, 22] as V3, w: 12, d: 7, rot: 0.15, tone: 0}, {p: [-6, 0, 22] as V3, w: 10, d: 8, rot: -0.1, tone: 1},
	{p: [8, 0, 25] as V3, w: 12, d: 7, rot: 0.2, tone: 2}, {p: [24, 0, 16] as V3, w: 11, d: 9, rot: 0.4, tone: 0},
	{p: [-25, 0, 3] as V3, w: 8, d: 10, rot: 0.3, tone: 2}, {p: [31, 0, -8] as V3, w: 9, d: 12, rot: 0.1, tone: 1},
	{p: [5, 0, -22] as V3, w: 9, d: 8, rot: 0.25, tone: 0}, {p: [-14, 0, -20] as V3, w: 10, d: 7, rot: -0.3, tone: 1},
];
const VILLAGE: {p: V3; rot: number; fl: number}[] = [
	{p: [12, 0, -12], rot: 0.3, fl: 1}, {p: [16.8, 0, -11], rot: -0.2, fl: 2}, {p: [12.2, 0, -15.6], rot: 0.8, fl: 1},
	{p: [17.4, 0, -15.2], rot: 0.1, fl: 1}, {p: [11.2, 0, -18.8], rot: -0.5, fl: 2}, {p: [16.8, 0, -19.2], rot: 0.4, fl: 1},
	{p: [19.8, 0, -12.6], rot: 1.2, fl: 1}, {p: [9.6, 0, -14.6], rot: -0.9, fl: 1},
];
const LAMPS: V3[] = [[13.3, 0, -10], [15.4, 0, -13.2], [13.4, 0, -16.6], [15.6, 0, -19.4]];
const P1: V3 = [5, 0, -4.5];
const P2: V3 = [9.5, 0, -8.2];
const PH = 3.6;
const STATION: V3 = [1.6, 0, -1.1];
const VSTATION: V3 = [12.4, 0, -9.4];
// Leiterseil-Aufhaengung (Mast um -45 Grad gedreht, Ausleger quer zur Leitung)
const arm = (p: V3, side: number): V3 => [p[0] + side * 0.636, PH * 0.8 - 0.22, p[2] + side * 0.636];

const PATH_NAC: V3[] = [[0, NAC_Y, -1.4], [0.05, NAC_Y + 0.05, -1.82], [0.18, NAC_Y - 0.05, -2.02]];
const PATH_TOWER: V3[] = [[0.18, NAC_Y + 0.1, -2.02], [-0.05, 14.6, -1.0], [0.12, 14.3, 0], [0.12, 8, 0], [0.12, 0.8, 0], [0.8, 0.3, -0.6], [STATION[0], 0.35, STATION[2]]];
const PATH_GRID: V3[] = [
	[STATION[0], 0.5, STATION[2]], [3.5, 2.0, -2.6], arm(P1, 1), [7.9, 2.2, -5.7], arm(P2, 1), [11.5, 1.6, -8.6], [VSTATION[0], 0.6, VSTATION[2]],
	[13.5, 0.6, -11.5], [16.2, 0.7, -11.5], [13.2, 0.6, -15], [17, 0.6, -15.3],
];

const head = (s: number, dur: number) => clamp01(s / dur);

const Scene: React.FC = () => {
	const {tl, f, look} = useScene();
	const sGen = since(tl, 'generator', f);
	const sStrom = since(tl, 'strom', f);
	const sNetz = since(tl, 'netz', f);
	const lit = clamp01((sNetz - 40) / 16);
	return (
		<>
			<Lights shadowSize={30} />
			<Sky />
			<Island r={48} />
			<Hill p={[-20, -1.5, -12]} s={[11, 4, 9]} alt />
			<Hill p={[22, -2, 6]} s={[12, 3.6, 10]} />
			<Hill p={[-6, -2.5, -30]} s={[18, 5, 10]} />
			<Hill p={[30, -2.5, -26]} s={[14, 5, 12]} alt />
			<Fields items={FIELDS} />
			<Road points={MAIN_ROAD} width={0.55} cars={5} />
			<Road points={ACCESS_ROAD} width={0.4} />
			<Forest c={[-10, 0, 5]} r={3.5} n={22} seed="w1" />
			<Forest c={[6, 0, 17]} r={3} n={14} seed="w2" />
			<Forest c={[-16, 0, -4]} r={5} n={30} seed="w3" />
			<Forest c={[24, 0, 2]} r={4} n={20} seed="w4" />
			<Forest c={[-28, 0, -14]} r={6} n={34} seed="w5" conifer={0.8} />
			<Forest c={[30, 0, -20]} r={5} n={24} seed="w6" />
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
			<Figure p={[1.5, 0, 2.0]} rot={-0.6} s={0.2} lookUp={1} />
			<Figure p={[1.85, 0, 2.15]} rot={-0.9} s={0.18} lookUp={1} />
			<Figure p={[13.1, 0, -11]} rot={0.4} s={0.2} />

			{/* Uebergabestation am Turmfuss, Gittermasten, Dorf */}
			<group position={STATION}>
				<mesh position={[0, 0.2, 0]} castShadow>
					<boxGeometry args={[0.55, 0.4, 0.38]} />
					<Mat c={look.objectAlt} part="kabel" rough={0.7} />
				</mesh>
				<mesh position={[0, 0.43, 0]}>
					<boxGeometry args={[0.62, 0.05, 0.45]} />
					<Mat c={look.dark} />
				</mesh>
			</group>
			<Pylon p={P1} rot={-Math.PI / 4} h={PH} />
			<Pylon p={P2} rot={-Math.PI / 4} h={PH} />
			{[1, -1].map((sd) => (
				<React.Fragment key={sd}>
					<Wire a={[STATION[0], 0.45, STATION[2]]} b={arm(P1, sd)} sag={0.3} />
					<Wire a={arm(P1, sd)} b={arm(P2, sd)} sag={0.5} />
					<Wire a={arm(P2, sd)} b={[VSTATION[0], 0.55, VSTATION[2]]} sag={0.3} />
				</React.Fragment>
			))}
			<mesh position={[VSTATION[0], 0.25, VSTATION[2]]} castShadow>
				<boxGeometry args={[0.4, 0.5, 0.4]} />
				<Mat c={look.objectAlt} rough={0.7} />
			</mesh>
			{VILLAGE.map((h, i) => (
				<House key={i} p={h.p} rot={h.rot} s={0.9} floors={h.fl} lit={clamp01(lit * 1.6 - i * 0.1)} />
			))}
			{/* Dorfkirche */}
			<group position={[19.2, 0, -17.6]} rotation={[0, 0.5, 0]}>
				<mesh position={[0, 0.6, 0]} castShadow>
					<boxGeometry args={[1.0, 1.2, 2.0]} />
					<Mat c={look.house} rough={0.9} />
				</mesh>
				<mesh position={[0, 1.1, 1.2]} castShadow>
					<boxGeometry args={[0.6, 2.2, 0.6]} />
					<Mat c={look.house} rough={0.9} />
				</mesh>
				<mesh position={[0, 2.75, 1.2]} castShadow>
					<coneGeometry args={[0.45, 1.1, 4]} />
					<Mat c={look.roof} />
				</mesh>
			</group>
			{LAMPS.map((p, i) => (
				<StreetLight key={i} p={p} on={clamp01(lit * 1.5 - i * 0.15)} />
			))}

			<Flow points={PATH_NAC} head={head(sGen, 18)} n={14} speed={0.018} size={0.035} />
			<Flow points={PATH_TOWER} head={head(sStrom, 40)} n={90} speed={0.007} size={0.06} />
			<Flow points={PATH_GRID} head={head(sNetz, 40)} n={80} speed={0.008} size={0.085} />
			{look.glow && lit > 0 ? <Halo p={[14.5, 0.3, -14.5]} r={7} c={look.window} opacity={0.035 * lit} /> : null}
		</>
	);
};

export const windrad: Topic = {
	id: 'windrad',
	startShot: 'tip',
	shots: {
		tip: {pos: [5.5, 19.5, 10.6], target: [0, 18.8, 1.55], fov: 52},
		wide: {pos: [17, 6.5, 33], target: [0, 11, 0], fov: 40, orbit: 2, push: 0.01},
		hoehe: {pos: [-4, 8, 38], target: [-5.2, 10, 1], fov: 46, push: 0.012},
		blatt: {pos: [7.5, 11.5, 9.5], target: [0, 14, 1.55], fov: 46, orbit: -3, push: 0.015},
		gondel: {pos: [5.2, 17.2, 6.2], target: [0, 15, -0.5], fov: 34, orbit: 6},
		welle: {pos: [2.0, 15.75, 2.4], target: [0, 15, 0.6], fov: 42, push: 0.03},
		getriebe: {pos: [2.5, 16.05, 1.35], target: [0, 15.0, -0.1], fov: 42, push: 0.03},
		generator: {pos: [2.1, 15.95, -0.55], target: [0, 15.0, -1.4], fov: 44, push: 0.03},
		trafo: {pos: [2.3, 16.1, -1.1], target: [0, 14.95, -2.0], fov: 44, push: 0.03},
		turm: {pos: [9, 9, 18], target: [0, 8.5, 0], fov: 52, push: 0.02},
		netz: {pos: [-2.5, 6.5, 6.5], target: [11, 0.5, -11], fov: 40, push: 0.02},
	},
	anchors: {
		nabe: [1.6, 15, 1.55],
		dom: [-11, 15.7, 3],
		getriebe: [0, 15.42, -0.1],
		generator: [0, 15.4, -1.4],
		trafo: [0.18, 15.25, -2.02],
		netz: [14.5, 1.6, -14],
	},
	Scene,
};
