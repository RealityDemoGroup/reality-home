import * as THREE from 'three';

class Background {
	constructor(radius, detail, material) {
		this.radius = radius;
		this.detail = detail;
		this.material = material;
		this.speedX = 1000;
		this.speedY = 400;
		this.speedZ = 2000;
		this.create();
	}

	create() {
		this.bgGroup = new THREE.Group();
		const geo = new THREE.IcosahedronGeometry(this.radius, this.detail);
		//this.bgGroup.add(new THREE.Mesh(geo, this.material));

		const p = geo.attributes.position;
		let noTri = p.count / 3;	// number of triangles
		//console.log("BG Triangles", noTri);			
		//noTri = 10;

		// instanced pyramid
		this.bgMesh = this.createInstancedPyramid(this.material, noTri);
		this.bgGroup.add(this.bgMesh);
		this.instances = [];

		// do some triangles
		let o = 0; // offset in arrays
		for (let i = 0; i < noTri; i++) {
			const v1 = new THREE.Vector3().fromArray(p.array, o);
			o += 3;
			const v2 = new THREE.Vector3().fromArray(p.array,o);
			o += 3;
			const v3 = new THREE.Vector3().fromArray(p.array,o);
			o += 3;
			this.createInstance(v1, v2, v3);
			//this.createDebugTriangle(v1, v2, v3);
		}
	}

	setRotationSpeed(x,y,z) {
		this.speedX = x;
		this.speedY = y;
		this.speedZ = z;
	}

	/*
	createDebugTriangle(v1, v2, v3) {
		const p = new Float32Array([
			v1.x, v1.y, v1.z,
			v2.x, v2.y, v2.z,
			v3.x, v3.y, v3.z,
		]);

		const g = new THREE.BufferGeometry();
		g.setAttribute( 'position', new THREE.Float32BufferAttribute( p, 3 ) );

		const w = new THREE.WireframeGeometry( g );
		const l = new THREE.LineSegments( w );
		l.material.depthTest = false;
		l.material.color.set(0xff0000);
		this.bgGroup.add(l);
	}
	*/

	createInstance(v1, v2, v3) {
		// triangle from base vertex
		const t = new THREE.Triangle(v1, v2, v3);
		const midPoint = new THREE.Vector3();
		t.getMidpoint(midPoint);

		// calc rotation
		const mr = new THREE.Matrix4();
		mr.lookAt(
			new THREE.Vector3(),
			midPoint,
			new THREE.Vector3().subVectors(v3, midPoint).normalize()
		);

		// calc scale approximation, not really same size triangles
		const sx = new THREE.Vector3().subVectors(v1, v2).length();
		const sy = new THREE.Vector3().subVectors(v1, v3).length();
		const sz = sy / 3 * 2;

		const i = {
			position: midPoint.clone(),
			scale: new THREE.Vector3(sx, sy, sz),
			euler: new THREE.Euler().setFromRotationMatrix(mr, 'XYZ')
		}
		this.instances.push(i);
	}

	createInstancedPyramid(mat, noTri) {
		const x1 = -0.5;
		const x2 = 0.5;
		const len = x2-x1;
		const yh = Math.sqrt(Math.pow(len, 2) - Math.pow(len / 2, 2));
		const y1 = -(yh / 3);
		const y2 = yh / 3 * 2;

		const p = new Float32Array([
			x1, y1, y2,
			x2, y1, y2,
			0, y2, y2,

			x1, y1, y2,
			0, 0, -y2,
			x2, y1, y2,

			x2, y1, y2,
			0, 0, -y2,
			0, y2, y2,

			0, y2, y2,
			0, 0, -y2,
			x1, y1, y2,
		]);

		const g = new THREE.BufferGeometry();
		g.setAttribute( 'position', new THREE.Float32BufferAttribute( p, 3 ) );
		g.setAttribute( 'normal', new THREE.Float32BufferAttribute( p.slice(), 3 ).onUpload( this.disposeArray ) );
		return new THREE.InstancedMesh(g, mat, noTri);
	}

	disposeArray() {
		this.array = null;
	}

	render(time) {
		const rotX = time / this.speedX;
		const rotY = time / this.speedY;
		const rotZ = time / this.speedZ;

		const m = new THREE.Matrix4();
		for (let i = 0; i < this.instances.length; i++) {
			const e = this.instances[i];
			const r = new THREE.Euler(
				e.euler.x + rotX,
				e.euler.y + rotY,
				e.euler.z + rotZ,
				'XYZ'
			);
			const q = new THREE.Quaternion();
			q.setFromEuler( r );
			m.compose( e.position, q, e.scale );
			this.bgMesh.setMatrixAt( i, m );
		}
		this.bgMesh.instanceMatrix.needsUpdate = true;
	}
}

export { Background };