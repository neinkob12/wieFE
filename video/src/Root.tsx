import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Explainer, type ExplainerProps} from './Explainer';
import type {Timeline} from './kit/core';

const defaults: ExplainerProps = {id: 'windrad', timeline: null, look: null, overlays: true};

export const Root: React.FC = () => (
	<Composition
		id="Explainer"
		component={Explainer}
		width={1080}
		height={1920}
		fps={30}
		durationInFrames={300}
		defaultProps={defaults}
		calculateMetadata={async ({props}) => {
			const tl: Timeline = props.timeline ?? (await fetch(staticFile(`timelines/${props.id}.json`)).then((r) => r.json()));
			return {durationInFrames: tl.durationInFrames, fps: tl.fps, props: {...props, timeline: tl}};
		}}
	/>
);
