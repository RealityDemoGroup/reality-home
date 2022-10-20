import * as THREE from 'three';
import { TextGeometry } from 'textGeometry';

class Scroller {

	constructor(text, font, material) {
		this.text = text;
		this.font = font;
		this.material = material;

		this.setFontParams(0.5, 0.3, 1.1, 4);
		this.setFontBevel(0.02, 0.02, 1);
		
		this.radius = 3;
		this.speed = 2000;

		this.meshesMap = new Map();
		this.angleTotal = 0;

		this.scroll = null;
	}

	setFontParams(size, height, letterSpacing, curveSegments) {
		this.fontSize = size;
		this.fontHeight = height;
		this.letterSpacing = letterSpacing;
		this.curveSegments = curveSegments;
	}

	setFontBevel(size, thickness, segments) {
		this.bevelSize = size;
		this.bevelThickness = thickness;
		this.bevelSegments = segments;
		this.bevelEnabled = this.bevelSize != 0 
			&& this.bevelThickness != 0 
			&& this.bevelSegments != 0;
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
		// space angle
		const spaceAngle = this.widthToAngle(spaceWidth) * this.letterSpacing;

		// add space to meshes map to have angle width
		this.meshesMap.set(" ", {
			angle: spaceAngle,
			mesh: null
		});

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
				this.angleTotal += spaceAngle;
				continue;
			}
			this.createLetter(letter, lineHeight, txtGeoParams);
		}
		console.log("Total scroll angle", this.angleTotal);
		return this.scroll;
	}

	createLetter(letter, lineHeight, txtGeoParams) {
		let mi = this.meshesMap.get(letter);
		// already created
		if (undefined != mi) {
			this.angleTotal += mi.angle;
			return;
		}

		// create
		const g = new TextGeometry(letter, txtGeoParams);
		g.computeBoundingBox();
		const width = g.boundingBox.max.x - g.boundingBox.min.x;
		const centerOffsetX = -0.50 * width;
		const centerOffsetY = -0.25 * lineHeight;
		g.translate(centerOffsetX, centerOffsetY, 0);

		const angle = this.widthToAngle(width) * this.letterSpacing;
		this.angleTotal += angle;

		const maxInstance = Math.ceil(Math.PI * 2 / angle);
		mi = new THREE.InstancedMesh(g, this.material, maxInstance);
		mi.name = letter;
		mi.visible = false;
		mi.count = 0; // no instances displayed
		this.meshesMap.set(letter, {
			angle: angle,
			mesh: mi
		});
		this.scroll.add(mi);
	}

	hideAll() {
		// hide all scroll letters
		this.meshesMap.forEach((v, k) => {
			if (null != v.mesh) {
				v.mesh.visible = false;
				v.mesh.count = 0;
			}
		});
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
			let letter = this.meshesMap.get(this.text[i++]);
			angleStart -= letter.angle / 2;
			i = (i >= this.text.length) ? 0 : i;
			// move for half width of next letter
			letter = this.meshesMap.get(this.text[i]);
			angleStart -= letter.angle / 2;
		}

		// ending angle for draw
		let angleEnd = 0;
		if (repeat) {
			angleEnd -= (PI2 - angleStart);
		}

		// show scroll letters
		this.hideAll();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3(1,1,1);
		const matrix = new THREE.Matrix4();
		while (angleStart > angleEnd) {
			let letter = this.meshesMap.get(this.text[i++]);
			if (null != letter.mesh) {
				const rot = PI2 - angleStart;

				const position = new THREE.Vector3(
					this.radius * Math.sin(rot),
					0,
					this.radius * Math.cos(rot)
				);

				const rotation = new THREE.Euler( 0, rot, 0, 'XYZ' );
				quaternion.setFromEuler( rotation );

				matrix.compose( position, quaternion, scale );

				letter.mesh.setMatrixAt( letter.mesh.count++, matrix );
				letter.mesh.instanceMatrix.needsUpdate = true;
				letter.mesh.visible = true;
			}

			// NOTE: Letters are centered and width is calculated
			// on complete letter, spacing is between two half's of letters
			// move for half width of current letter
			angleStart -= letter.angle / 2;
			i = (i >= this.text.length) ? 0 : i;
			// move for half width of next letter
			letter = this.meshesMap.get(this.text[i]);
			angleStart -= letter.angle / 2;
		}
	}
}

export { Scroller };