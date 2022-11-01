import * as THREE from 'three';
import { TextGeometry } from 'textGeometry';

class ScrollerTorus {

	constructor(text, font, fontScale, material) {
		this.PI2 = Math.PI * 2;

		this.text = text;
		this.font = font;
		this.material = material;

		// defaults for font, scale controls size
		this.setFontParams(fontScale, 1, 0.6, 1.1, 4);
		this.setFontBevel(0.04, 0.04, 1);
		
		this.setRadius(3, 0.5, 2);
		this.setSpeed(2000, 4000);

		this.meshesMap = new Map();
		this.angleTotal = 0;

		this.scroll = null;
	}

	setRadius(radius, radiusTorus, twists) {
		this.radius = radius;
		this.radiusTorus = radiusTorus;
		this.radiusOuter = this.radius + this.radiusTorus;
		// number of scroll twists around torus
		this.twists = twists;
		this.angleStepTorus = this.PI2 / (360 / this.twists);
		// calculate max letter slant
		const torusLen = this.radius * 2 * Math.PI;
		const torusSegmentLen = torusLen / this.twists;
		// angle between torus diameter and torus segment length
		// x2 because slanting left and right, not ideal could be better
		this.letterSlantMax = Math.atan(this.radiusTorus * 2 / torusSegmentLen) * 2;
	}

	setSpeed(speed, speedTorus) {
		this.speed = speed;
		this.speedTorus = speedTorus;
	}

	setFontParams(scale, size, height, letterSpacing, curveSegments) {
		this.fontScale = scale;
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
		return Math.asin(width * this.fontScale / 2 / this.radius) * 2 * this.letterSpacing;
	}

	create() {
		this.scroll = new THREE.Group();
		this.scroll.rotateY(Math.PI);

		// ref: https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/FontLoader.js
		// scale and line height from font
		const glyphScale = this.fontSize / this.font.data.resolution;
		const lineHeight = ( this.font.data.boundingBox.yMax - this.font.data.boundingBox.yMin + this.font.data.underlineThickness ) * glyphScale;
		// space letter width
		const spaceGlyph = this.font.data.glyphs[" "];
		const spaceWidth = spaceGlyph.ha * glyphScale;
		// space angle
		const spaceAngle = this.widthToAngle(spaceWidth);

		// add space to meshes map to have angle width
		this.meshesMap.set(" ", {
			width: spaceWidth,
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
		console.log("Total scroll torus angle", this.angleTotal);
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

		const angle = this.widthToAngle(width);
		this.angleTotal += angle;

		const maxInstance = Math.ceil(this.PI2 / angle);
		mi = new THREE.InstancedMesh(g, this.material, maxInstance);
		mi.name = letter;
		mi.visible = false;
		mi.count = 0; // no instances displayed
		this.meshesMap.set(letter, {
			width: width,
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
		// angle position depending on time
		let angle = time / this.speed;
		// clip position angle
		let tot = this.angleTotal > this.PI2 ? this.angleTotal : Math.floor( this.PI2 / this.angleTotal) * this.angleTotal + this.angleTotal;
		if (angle > tot) {
			angle = (angle % tot) + tot;
		}

		// angle position on torus surface from corrected angle
		let angleTorus = (angle * this.speed / this.speedTorus) % this.PI2;

		// find start letter index and correct draw angle start
		let i = 0;
		while (angle > this.PI2) {
			// NOTE: Letters are centered and width is calculated
			// on complete letter, spacing is between two half's of letters
			// move for half width of current letter
			let letter = this.meshesMap.get(this.text[i++]);
			angle -= letter.angle / 2;
			i = (i >= this.text.length) ? 0 : i;
			// move for half width of next letter
			letter = this.meshesMap.get(this.text[i]);
			angle -= letter.angle / 2;
			
			// move around torus
			angleTorus -= this.angleStepTorus;
		}

		// show scroll letters
		this.hideAll();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3(this.fontScale,this.fontScale,this.fontScale);
		const matrix = new THREE.Matrix4();
		while (angle > 0) {
			let letter = this.meshesMap.get(this.text[i++]);
			if (null != letter.mesh) {
				const rot = this.PI2 - angle;

				// position on torus
				const torusX = this.radiusTorus * Math.cos(angleTorus);
				const torusY = this.radiusTorus * Math.sin(angleTorus);
				const position = new THREE.Vector3(
					(this.radius + torusX) * Math.sin(rot),
					torusY,
					(this.radius + torusX) * Math.cos(rot)
				);

				// rotation is in different order to allow letter tilt and slant around torus
				const tilt = -angleTorus;
				const slant = Math.sin(angleTorus) * this.letterSlantMax - this.letterSlantMax;
				const rotation = new THREE.Euler(
					tilt, rot, slant, 'YXZ'
				);
				quaternion.setFromEuler( rotation );

				matrix.compose( position, quaternion, scale );

				letter.mesh.setMatrixAt( letter.mesh.count++, matrix );
				letter.mesh.instanceMatrix.needsUpdate = true;
				letter.mesh.visible = true;
			}

			// NOTE: Letters are centered and width is calculated
			// on complete letter, spacing is between two half's of letters
			// move for half width of current letter
			angle -= letter.angle / 2;
			i = (i >= this.text.length) ? 0 : i;
			// move for half width of next letter
			letter = this.meshesMap.get(this.text[i]);
			angle -= letter.angle / 2;

			// move around torus
			angleTorus -= this.angleStepTorus;
		}
	}
}

export { ScrollerTorus };