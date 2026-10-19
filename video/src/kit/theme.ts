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
	accent: string; // "hier passiert's"
	energy: string; // Strom, Wasser, Waerme fliessen
	glass: string; // Roentgen-Huelle
	copper: string;
	air: string; // Wind-Streifen
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
	// A: Simplicissimus-inspiriert, warm und gedaempft, Diorama-Insel
	diorama: {
		id: 'diorama', name: 'Diorama (warm & gedämpft)',
		skyTop: '#E4D6BF', skyBottom: '#F3ECE0', fog: '#EFE6D6',
		ground: '#5E8C76', groundAlt: '#4C7A67', earth: '#B9855B', earthDark: '#8E6244',
		tree: '#2F5D62', treeAlt: '#3F6E5E',
		object: '#F4EFE6', objectAlt: '#D9D0C1', metal: '#9AA3A8', dark: '#3A3A48', ink: '#2B2A33',
		accent: '#E8743B', energy: '#F2C14E', glass: '#CFE3E6', copper: '#C27C4E', air: '#6E97A6', magnetN: '#C8553D', magnetS: '#4F7CAC',
		house: '#EADFCB', roof: '#B5523B', window: '#FFE7A3', cloud: '#FBF7F0',
		text: '#FFFDF8', textDim: '#EADFCB', cardBg: '#2B2A33',
		flat: true, roughness: 0.95, sun: 2.1, ambient: 0.55, sunColor: '#FFF1DC', hemiSky: '#FFF4E0', hemiGround: '#6B7F6A',
		grain: 0.09, vignette: 0.28, glow: false,
		fontCaption: 'Manrope', fontDisplay: 'Fraunces',
	},
	// B: eigener Vorschlag, Nachtschicht: dunkel, Technik wird zur Lichtspur
	nacht: {
		id: 'nacht', name: 'Nachtschicht (dunkel, Energie leuchtet)',
		skyTop: '#0B1424', skyBottom: '#1B2C45', fog: '#14223A',
		ground: '#27445E', groundAlt: '#203a52', earth: '#2A3B52', earthDark: '#1A2738',
		tree: '#2E5873', treeAlt: '#376683',
		object: '#D8E3EF', objectAlt: '#9DB1C6', metal: '#7D8FA3', dark: '#0F1A2A', ink: '#0B1220',
		accent: '#FF8A3D', energy: '#5CE1FF', glass: '#5CE1FF', copper: '#D9935F', air: '#5CE1FF', magnetN: '#FF5E5E', magnetS: '#5E9BFF',
		house: '#3A5372', roof: '#2A3F5A', window: '#FFD66B', cloud: '#3A5070',
		text: '#F1F6FF', textDim: '#9FB3C8', cardBg: '#0B1424',
		flat: true, roughness: 0.7, sun: 1.9, ambient: 0.62, sunColor: '#B9D2FF', hemiSky: '#7F9FD0', hemiGround: '#24364F',
		grain: 0.06, vignette: 0.45, glow: true,
		fontCaption: 'Space Grotesk', fontDisplay: 'Space Grotesk',
	},
	// C: eigener Vorschlag, Knete: weiche Spielzeugwelt, runde Formen, Pastell
	knete: {
		id: 'knete', name: 'Knete (weiches Pastell-Spielzeug)',
		skyTop: '#BFE3F2', skyBottom: '#F6F1FF', fog: '#E8F1F8',
		ground: '#A8DDB5', groundAlt: '#93D1A4', earth: '#F2B6A0', earthDark: '#E39A86',
		tree: '#6CC3A0', treeAlt: '#86D0B0',
		object: '#FFFFFF', objectAlt: '#E6E1F5', metal: '#B8B5D6', dark: '#6D6A8C', ink: '#4A4766',
		accent: '#FF6F91', energy: '#FFC94A', glass: '#C9E8FF', copper: '#F4A261', air: '#7AA7FF', magnetN: '#FF7A7A', magnetS: '#7AA7FF',
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
