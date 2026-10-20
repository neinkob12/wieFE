// Die Design-Vorlage: jedes "Wie funktioniert eigentlich ...?"-Video ist diese Komposition + ein Thema (3D-Szene) + eine Timeline.
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {cameraAt, SceneCtx, type Timeline, type Topic} from './kit/core';
import {Captions, Cards, DraftBadge, Grain, Labels} from './kit/Overlays';
import {fontFaces, LookCtx, LOOKS, type Look} from './kit/theme';
import {TOPICS} from './topics';

export type Quality = {aa?: boolean; shadows?: boolean};
export type ExplainerProps = {id: string; timeline: Timeline | null; look?: Look['id'] | null; overlays?: boolean; quality?: Quality};

const CameraRig: React.FC<{tl: Timeline; topic: Topic}> = ({tl, topic}) => {
	const f = useCurrentFrame();
	const camera = useThree((s) => s.camera) as import('three').PerspectiveCamera;
	const pose = cameraAt(tl, topic, f);
	useLayoutEffect(() => {
		camera.position.set(...pose.pos);
		camera.fov = pose.fov;
		camera.near = 0.05;
		camera.far = 600;
		camera.lookAt(...pose.target);
		camera.updateProjectionMatrix();
	});
	return null;
};

const useFonts = () => {
	const [handle] = useState(() => delayRender('Schriften laden'));
	useEffect(() => {
		const specs = ['800 40px Manrope', '600 40px Manrope', '900 40px Fraunces', '700 40px "Space Grotesk"', '900 40px Nunito', '800 40px Nunito'];
		Promise.all(specs.map((s) => document.fonts.load(s))).then(() => continueRender(handle), () => continueRender(handle));
	}, [handle]);
};

export const Explainer: React.FC<ExplainerProps> = ({timeline, look: lookOverride, overlays = true, quality = {}}) => {
	useFonts();
	const f = useCurrentFrame();
	const {width, height} = useVideoConfig();
	if (!timeline) return null;
	const tl = timeline;
	const topic = TOPICS[tl.topic];
	const look = LOOKS[lookOverride ?? tl.look] ?? LOOKS.diorama;
	const state = {tl, topic, look, f};
	return (
		<LookCtx.Provider value={look}>
			<AbsoluteFill style={{background: `linear-gradient(180deg, ${look.skyTop} 0%, ${look.skyBottom} 70%, ${look.fog} 100%)`}}>
				<style>{fontFaces(staticFile)}</style>
				<ThreeCanvas width={width} height={height} shadows={quality.shadows !== false} gl={{antialias: quality.aa !== false, alpha: true}} camera={{fov: 40, position: [0, 10, 30]}}>
					<SceneCtx.Provider value={state}>
						<CameraRig tl={tl} topic={topic} />
						<topic.Scene />
					</SceneCtx.Provider>
				</ThreeCanvas>
				<Grain look={look} />
				{overlays ? (
					<>
						<Labels tl={tl} topic={topic} look={look} />
						<Cards tl={tl} look={look} />
						<Captions tl={tl} look={look} />
						{tl.draftVoice ? <DraftBadge look={look} /> : null}
					</>
				) : null}
				{tl.voice.map((v) => (
					<Sequence key={v.src} from={v.from}>
						<Audio src={staticFile(v.src)} />
					</Sequence>
				))}
				{tl.sfx.map((s, i) => (
					<Sequence key={i} from={s.from} durationInFrames={s.dur}>
						<Audio src={staticFile(s.src)} volume={s.volume} />
					</Sequence>
				))}
			</AbsoluteFill>
		</LookCtx.Provider>
	);
};
