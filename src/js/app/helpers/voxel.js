import * as THREE from 'three';

import Material from './material';

import Config from '../../data/config';

// This helper class can be used to create and then place geometry in the scene
export default class Geometry {
    constructor(scene, xyzi, offset) {
        this.scene = scene;
        this.geo = null;
        this.offset = offset || { x: 0, y: 0, z: 0 };
        this.color = parseInt(`0x${xyzi[3]}`, 16);
        const vector = new THREE.Vector3(parseFloat(xyzi[0]) + offset.x, parseFloat(xyzi[2]) + offset.y, parseFloat(xyzi[1]) + offset.z);
        this.geo = new THREE.BoxGeometry(1, 1, 1);
        this.place(vector, [0, 0, 0]);

    }

    place(position, rotation) {
        var voxelMaterial = new THREE.MeshPhongMaterial( {
            color: new THREE.Color(this.color),
            flatShading: true,
            vertexColors: THREE.VertexColors,
            shininess: 0
        } );
        var wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
        const mesh = new THREE.Mesh(this.geo, voxelMaterial);
        mesh.add(new THREE.Mesh(this.geo, wireframeMaterial));
        mesh.position.x = position.x;
        mesh.position.y = position.y;
        mesh.position.z = position.z;
        mesh.rotation.set(...rotation);

        if (Config.shadow.enabled) {
            mesh.receiveShadow = true;
            mesh.castShadow = true;
        }

        this.scene.add(mesh);
    }
}
