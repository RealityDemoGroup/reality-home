import * as THREE from 'three';

class Background {
	constructor(radius, detail, material) {
		this.radius = radius;
		this.detail = detail;
		this.material = material;
		this.create();
	}

	create() {
		this.bgGroup = new THREE.Group();
		const geo = new THREE.IcosahedronGeometry(this.radius, this.detail);
		//this.bgGroup.add(new THREE.Mesh(geo, this.material));

		const p = geo.attributes.position;
		let noTri = p.count / 3;	// number of triangles
		//console.log("BG Triangles", noTri);			
		//noTri = 50;

		// do some triangles
		let o = 0; // offset in arrays
		for (let i = 0; i < noTri; i++) {
			const v1 = new THREE.Vector3().fromArray(p.array, o);
			o += 3;
			const v2 = new THREE.Vector3().fromArray(p.array,o);
			o += 3;
			const v3 = new THREE.Vector3().fromArray(p.array,o);
			o += 3;
			this.bgGroup.add(this.createPyramid(v1, v2, v3));
		}
	}

	createPyramid(v1, v2, v3) {
		// triangle from base vertex
		const t = new THREE.Triangle(v1, v2, v3);
		// normal
		const n = new THREE.Vector3();
		t.getNormal(n);
		// midpoint will be v4
		const v4 = new THREE.Vector3();
		t.getMidpoint(v4);
		// center point, center point direction
		const c = v4.clone();
		const cd = n.clone();

		// http://www.mathematische-basteleien.de/tetrahedron.htm
		// height calc
		const edgeLen = v1.distanceTo(v2);
		const height = Math.sqrt(3) / 4 * edgeLen; 

		// position 4th vertex
		n.multiplyScalar(height);	// size normal to height
		v4.add(n);					// position normal to space

		// position pyramid center point
		cd.multiplyScalar(height / 3);
		c.add(cd);

		// position pyramid to center
		v1.sub(c);
		v2.sub(c);
		v3.sub(c);
		v4.sub(c);

		const pos = new Float32Array([
			v1.x, v1.y, v1.z,
			v3.x, v3.y, v3.z,
			v2.x, v2.y, v2.z,

			v1.x, v1.y, v1.z,
			v2.x, v2.y, v2.z,
			v4.x, v4.y, v4.z,
			
			v3.x, v3.y, v3.z,
			v1.x, v1.y, v1.z,
			v4.x, v4.y, v4.z,

			v3.x, v3.y, v3.z,
			v4.x, v4.y, v4.z,
			v2.x, v2.y, v2.z,
		]);

		const g = new THREE.BufferGeometry();
		g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
		g.setAttribute( 'normal', new THREE.Float32BufferAttribute( pos.slice(), 3 ).onUpload( this.disposeArray ) );
		const m = new THREE.Mesh(g, this.material);
		m.translateX(c.x);
		m.translateY(c.y);
		m.translateZ(c.z);
		return m;
	}

	disposeArray() {
		this.array = null;
	}

	render(time, speedX, speedY, speedZ) {
		const rotX = time / speedX;
		const rotY = time / speedY;
		const rotZ = time / speedZ;
		for (let i = 0; i < this.bgGroup.children.length; i++) {
			this.bgGroup.children[i].rotation.x = rotX;
			this.bgGroup.children[i].rotation.y = rotY;
			this.bgGroup.children[i].rotation.z = rotZ;
		}
	}
}

export { Background };