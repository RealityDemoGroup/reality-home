import * as THREE from 'three';
import { TextGeometry } from 'textGeometry';

class Scroller {

	constructor(text, font, material) {
		this.text = text;
		this.font = font;
		this.material = material;

		this.fontSize = 0.5;
		this.fontHeight = 0.3;
		this.letterSpacing = 1.1;
		this.curveSegments = 4;

		this.bevelThickness = 0.02;
		this.bevelSize = 0.02;
		this.bevelSegments = 1;
		this.bevelEnabled = true;
		
		this.radius = 3;
		this.speed = 2000;

		this.meshes = [];
		this.angles = [];
		this.angleTotal = 0;

		this.scroll = null;
	}

	widthToAngle(width) {
		return Math.asin(width / 2 / this.radius) * 2;
	}

	create() {
		this.scroll = new THREE.Group();
		this.scroll.rotateY(Math.PI);

		// ref: https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/FontLoader.js
		// scale and line height from font
		const fontScale = this.fontSize / this.font.data.resolution;
		const lineHeight = ( this.font.data.boundingBox.yMax - this.font.data.boundingBox.yMin + this.font.data.underlineThickness ) * fontScale;
		// space letter width
		const spaceGlyph = this.font.data.glyphs[" "];
		const spaceWidth = spaceGlyph.ha * fontScale;

		// text geometry params
		const txtGeoParams = {
			font: this.font,
			size: this.fontSize,
			height: this.fontHeight,
			curveSegments: this.curveSegments,
			bevelThickness: this.bevelThickness,
			bevelSize: this.bevelSize,
			bevelSegments: this.bevelSegments,
			bevelEnabled: this.bevelEnabled
		};

		// build scroll meshes
		for (let i = 0; i < this.text.length; i++) {
			const letter = this.text[i];
			if (" " == letter) {
				const angle = this.widthToAngle(spaceWidth) * this.letterSpacing;
				this.angleTotal += angle;
				this.angles.push(angle);

				this.meshes.push(null);
				continue;
			}
			this.createLetter(letter, lineHeight, txtGeoParams);
		}
		console.log("Total scroll angle", this.angleTotal);
		return this.scroll;
	}

	createLetter(letter, lineHeight, txtGeoParams) {
		const g = new TextGeometry(letter, txtGeoParams);
		g.computeBoundingBox();
		const width = g.boundingBox.max.x - g.boundingBox.min.x;
		const centerOffsetX = -0.50 * width;
		const centerOffsetY = -0.25 * lineHeight;
		g.translate(centerOffsetX, centerOffsetY, 0);

		const angle = this.widthToAngle(width) * this.letterSpacing;
		this.angleTotal += angle;
		this.angles.push(angle);

		const m = new THREE.Mesh(g, this.material);
		m.name = letter;
		m.visible = false;
		this.meshes.push(m);
		this.scroll.add(m);
	}

	hideAll() {
		// hide all scroll letters
		for (let i = 0; i < this.meshes.length; i++) {
			if (null == this.meshes[i]) {
				continue;
			}
			this.meshes[i].visible = false;
		}
	}

	render(time) {
		const PI2 = Math.PI * 2;
		// angle position depending on time
		const anglePos = time / this.speed;
		// angle start show
		let angleStart = anglePos % this.angleTotal;
		// complete scroll shown repeat it
		const repeat = anglePos > this.angleTotal;
		if (repeat) {
			angleStart += this.angleTotal;
		}
		// find start letter index and correct draw angle start
		let i = 0;
		while (angleStart > PI2) {
			// NOTE: Letters are centered and width is calculated
			// on complete letter, spacing is between two half's of letters
			// move for half width of current letter
			angleStart -= this.angles[i++] / 2;
			i = (i >= this.text.length) ? 0 : i;
			// move for half width of next letter
			angleStart -= this.angles[i] / 2;
		}

		// ending angle for draw
		let angleEnd = 0;
		if (repeat) {
			angleEnd -= (PI2 - angleStart);
		}

		// show scroll letters
		this.hideAll();
		while (angleStart > angleEnd) {
			const m = this.meshes[i];
			if (null != m) {
				const rot = PI2 - angleStart;
				m.position.x = this.radius * Math.sin(rot);
				m.position.y = 0;
				m.position.z = this.radius * Math.cos(rot);
				m.setRotationFromEuler(new THREE.Euler( 0, rot, 0, 'XYZ' ));
				m.visible = true;
			}

			// NOTE: Letters are centered and width is calculated
			// on complete letter, spacing is between two half's of letters
			// move for half width of current letter
			angleStart -= this.angles[i++] / 2;
			i = (i >= this.text.length) ? 0 : i;
			// move for half width of next letter
			angleStart -= this.angles[i] / 2;
		}
	}
}

export { Scroller };