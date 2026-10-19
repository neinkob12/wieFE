// Looks: dieselbe Szene, drei Stile. Szenen benutzen nur Rollen (ground, object, accent ...), nie Hex-Werte direkt.
import {createContext, useContext} from 'react';

export type Look = {
	id: 'diorama' | 'nacht' | 'knete';
	name: string;
	skyTop: string;
	skyBottom: string;
	fog: string;
	ground: string;
	groundAlt: string;
	earth: string;
	earthDark: string;
	tree: string;
	treeAlt: string;
	object: string; // Hauptobjekt (Windrad, Toaster ...)
	objectAlt: string;
	metal: string;
	dark: string; // Innenteile, Schatten-Ton
	ink: string; // Figuren, Konturen
	accent: string; // "hier passiert's" (Untertitel, Karten, Labels)
	highlight: string; // Hervorhebung in 3D (kraeftiger als accent, damit es auf hellen Flaechen sichtbar bleibt)
	energy: string; // Strom, Wasser, Waerme fliessen
	glass: string; // Roentgen-Huelle
	copper: string;
	air: string; // Wind-Streifen
	signal: string; // rote Tagesmarkierung (Fluegelspitzen, Turmring, Bremssattel)
	magnetN: string;
	magnetS: string;
	house: string;
	roof: string;
	window: string;
	cloud: string;
	text: string;
	textDim: string;
	cardBg: string;
	flat: boolean; // flatShading: Low-Poly-Facetten sichtbar
	roughness: number;
	sun: number;
	ambient: number;
	sunColor: string;
	hemiSky: string;
	hemiGround: string;
	grain: number;
	vignette: number;
	glow: boolean; // Energie leuchtet (Nacht-Look)
	fontCaption: string;
	fontDisplay: string;
};

export const LOOKS: Record<Look['id'], Look> = {
	// A: verworfen (Orange), bleibt als Alternative. Warm und gedaempft, Diorama-Insel
	diorama: {
		id: 'diorama', name: 'Diorama (warm & gedämpft)',
		skyTop: '#E4D6BF', skyBottom: '#F3ECE0', fog: '#EFE6D6',
		ground: '#5E8C76', groundAlt: '#4C7A67', earth: '#B9855B', earthDark: '#8E6244',
		tree: '#2F5D62', treeAlt: '#3F6E5E',
		object: '#F4EFE6', objectAlt: '#D9D0C1', metal: '#9AA3A8', dark: '#3A3A48', ink: '#2B2A33',
		accent: '#E8743B', highlight: '#E8743B', energy: '#F2C14E', glass: '#CFE3E6', copper: '#C27C4E', air: '#6E97A6', signal: '#B5473A', magnetN: '#C8553D', magnetS: '#4F7CAC',
		house: '#EADFCB', roof: '#B5523B', window: '#FFE7A3', cloud: '#FBF7F0',
		text: '#FFFDF8', textDim: '#EADFCB', cardBg: '#2B2A33',
		flat: true, roughness: 0.95, sun: 2.1, ambient: 0.55, sunColor: '#FFF1DC', hemiSky: '#FFF4E0', hemiGround: '#6B7F6A',
		grain: 0.09, vignette: 0.28, glow: false,
		fontCaption: 'Manrope', fontDisplay: 'Fraunces',
	},
	// B: Nachtschicht x Orchidee (gewaehlt): dunkle Petrol-Nacht, bordeauxfarbener Horizont, Salbei-Technik,
	// Altrosa hebt hervor, Strom leuchtet petrol. Palette aus dem Orchideen-Moodboard (kein Orange).
	nacht: {
		id: 'nacht', name: 'Nachtschicht · Orchidee',
		skyTop: '#081214', skyBottom: '#13262B', fog: '#2A1C24',
		ground: '#1B3335', groundAlt: '#16292B', earth: '#3A2329', earthDark: '#26161B',
		tree: '#1F4245', treeAlt: '#29514F',
		object: '#C9D1CA', objectAlt: '#93A39E', metal: '#7E8F8B', dark: '#121D1F', ink: '#081012',
		accent: '#EEAEAF', highlight: '#E27886', energy: '#7ED9D6', glass: '#6CB2B3', copper: '#B98078', air: '#8FC9C6', signal: '#C2525F', magnetN: '#C2525F', magnetS: '#509C9F',
		house: '#4E6264', roof: '#4A292F', window: '#FFE4DE', cloud: '#22383B',
		text: '#F2F5F2', textDim: '#C9D1CA', cardBg: '#4A292F',
		flat: false, roughness: 0.62, sun: 2.2, ambient: 0.62, sunColor: '#D6E8E4', hemiSky: '#6CB2B3', hemiGround: '#2A191E',
		grain: 0.05, vignette: 0.42, glow: true,
		fontCaption: 'Space Grotesk', fontDisplay: 'Space Grotesk',
	},
	// C: verworfen, bleibt als Alternative. Knete: weiche Spielzeugwelt, runde Formen, Pastell
	knete: {
		id: 'knete', name: 'Knete (weiches Pastell-Spielzeug)',
		skyTop: '#BFE3F2', skyBottom: '#F6F1FF', fog: '#E8F1F8',
		ground: '#A8DDB5', groundAlt: '#93D1A4', earth: '#F2B6A0', earthDark: '#E39A86',
		tree: '#6CC3A0', treeAlt: '#86D0B0',
		object: '#FFFFFF', objectAlt: '#E6E1F5', metal: '#B8B5D6', dark: '#6D6A8C', ink: '#4A4766',
		accent: '#FF6F91', highlight: '#FF6F91', energy: '#FFC94A', glass: '#C9E8FF', copper: '#F4A261', air: '#7AA7FF', signal: '#FF7A7A', magnetN: '#FF7A7A', magnetS: '#7AA7FF',
		house: '#FFF3E2', roof: '#FF9F80', window: '#FFE38A', cloud: '#FFFFFF',
		text: '#FFFFFF', textDim: '#F6F1FF', cardBg: '#4A4766',
		flat: false, roughness: 0.85, sun: 2.0, ambient: 0.7, sunColor: '#FFFFFF', hemiSky: '#FFFFFF', hemiGround: '#C8B8E8',
		grain: 0.04, vignette: 0.15, glow: false,
		fontCaption: 'Nunito', fontDisplay: 'Nunito',
	},
};

export const LookCtx = createContext<Look>(LOOKS.diorama);
export const useLook = () => useContext(LookCtx);

export const fontFaces = (file: (p: string) => string) => `
@font-face{font-family:Manrope;font-weight:600;src:url(${file('fonts/manrope-latin-600-normal.woff2')}) format('woff2');}
@font-face{font-family:Manrope;font-weight:800;src:url(${file('fonts/manrope-latin-800-normal.woff2')}) format('woff2');}
@font-face{font-family:Fraunces;font-weight:700;src:url(${file('fonts/fraunces-latin-700-normal.woff2')}) format('woff2');}
@font-face{font-family:Fraunces;font-weight:900;src:url(${file('fonts/fraunces-latin-900-normal.woff2')}) format('woff2');}
@font-face{font-family:'Space Grotesk';font-weight:700;src:url(${file('fonts/space-grotesk-latin-700-normal.woff2')}) format('woff2');}
@font-face{font-family:Nunito;font-weight:800;src:url(${file('fonts/nunito-latin-800-normal.woff2')}) format('woff2');}
@font-face{font-family:Nunito;font-weight:900;src:url(${file('fonts/nunito-latin-900-normal.woff2')}) format('woff2');}
`;
