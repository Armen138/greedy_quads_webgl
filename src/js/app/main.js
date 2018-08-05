// Global imports -
import * as THREE from 'three';
import TWEEN from 'tween.js';

// Local imports -
// Components
import Renderer from './components/renderer';
import Camera from './components/camera';
import Light from './components/light';
import Controls from './components/controls';

// Helpers
import Geometry from './helpers/geometry';
import Voxel from './helpers/voxel';
import Greedy from './helpers/greedy';
import Stats from './helpers/stats';

import Material from './helpers/material';
// Model
import Texture from './model/texture';
// import Model from './model/model';

// Managers
import Interaction from './managers/interaction';
import DatGUI from './managers/datGUI';

// data
import Config from './../data/config';
// -- End of imports

// This class instantiates and ties all of the components together, starts the loading process and renders the main loop
export default class Main {
  constructor(container) {
    // Set container property to container element
    this.container = container;

    // Start Three clock
    this.clock = new THREE.Clock();

    // Main scene creation
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(Config.fog.color, Config.fog.near);

    // Get Device Pixel Ratio first for retina
    // if(window.devicePixelRatio) {
    //   Config.dpr = window.devicePixelRatio;
    // }

    // Main renderer constructor
    this.renderer = new Renderer(this.scene, container);

    // Components instantiations
    this.camera = new Camera(this.renderer.threeRenderer);
    this.controls = new Controls(this.camera.threeCamera, container);
    this.light = new Light(this.scene);

    // Create and place lights in scene
    const lights = ['ambient', 'directional', 'point', 'hemi'];
    lights.forEach((light) => this.light.place(light));

    // Create and place geo in scene
    this.geometry = new Geometry(this.scene);
    this.geometry.make('plane')(150, 150, 10, 10);
    this.geometry.place([0, -0.5, 0], [Math.PI / 2, 0, 0]);

    // fetch("assets/models/smile.txt").then((response) => {
    fetch("assets/models/FlameThrower.txt").then((response) => {

      return response.text();
    }).then((goxText) => {
      const voxels = goxText.split("\n");
      this.stupid(voxels);
      this.greedy(voxels);
    });
    // Set up rStats if dev environment
    if (Config.isDev && Config.isShowingStats) {
      this.stats = new Stats(this.renderer);
      this.stats.setUp();
    }

    // Instantiate texture class
    this.texture = new Texture();

    // Start loading the textures and then go on to load the model after the texture Promises have resolved
    this.texture.load().then(() => {
      this.manager = new THREE.LoadingManager();

      // Textures loaded, load model
      // this.model = new Model(this.scene, this.manager, this.texture.textures);
      // this.model.load();

      // onProgress callback
      this.manager.onProgress = (item, loaded, total) => {
        //console.log(`${item}: ${loaded} ${total}`);
      };

      // All loaders done now
      this.manager.onLoad = () => {
        // Set up interaction manager with the app now that the model is finished loading
        new Interaction(this.renderer.threeRenderer, this.scene, this.camera.threeCamera, this.controls.threeControls);

        // Add dat.GUI controls if dev
        if (Config.isDev) {
          new DatGUI(this, this.model.obj);
        }

        // Everything is now fully loaded
        Config.isLoaded = true;
        this.container.querySelector('#loading').style.display = 'none';
      };
      new Interaction(this.renderer.threeRenderer, this.scene, this.camera.threeCamera, this.controls.threeControls);

      // Add dat.GUI controls if dev
      if (Config.isDev) {
        // new DatGUI(this, null);
      }

      // Everything is now fully loaded
      Config.isLoaded = true;

      this.container.querySelector('#loading').style.display = 'none';

    });

    // Start render which does not wait for model fully loaded
    this.render();
  }
  stupid(voxels) {
    for (const voxel of voxels) {
      if (voxel.indexOf("#") !== 0 && voxel.indexOf(" ") !== -1) {
        const xyzi = voxel.split(" ");
        const offset = { x: 20, y: 0, z: 0 };
        const geometry = new Voxel(this.scene, xyzi, offset);
      }
    }
  }
  greedy(voxels) {
    const startTime = Date.now();
    const offset = { x: -20, y: 0, z: 0 };
    let geometry = new THREE.Geometry();
    let greedyVoxels = new Greedy(voxels);
    var d = 0;
    let bounds = [
      { start: greedyVoxels.boundingBox.z, end: greedyVoxels.boundingBox.z + greedyVoxels.boundingBox.depth },
      { start: greedyVoxels.boundingBox.y, end: greedyVoxels.boundingBox.y + greedyVoxels.boundingBox.height },
      { start: greedyVoxels.boundingBox.x, end: greedyVoxels.boundingBox.x + greedyVoxels.boundingBox.width }
    ];
    var xy = function(direction, reverse) {
      reverse = reverse || 0;
      for (d = bounds[direction].start; d < bounds[direction].end; d++) {
        let mask = greedyVoxels.getMask(direction, d, reverse);
        let quads = greedyVoxels.getQuads(mask, d);
        for (let quad of quads) {
          let vertexOffset = geometry.vertices.length;
          switch(direction) {
            case 0:
              quad.sub({ x: 0.5, y: 0.5 - greedyVoxels.boundingBox.y, z: 0.5 - reverse });
              geometry.vertices.push(new THREE.Vector3(quad.x,              quad.z, quad.y));
              geometry.vertices.push(new THREE.Vector3(quad.x + quad.width, quad.z, quad.y));
              geometry.vertices.push(new THREE.Vector3(quad.x + quad.width, quad.z, quad.y + quad.height));
              geometry.vertices.push(new THREE.Vector3(quad.x,              quad.z, quad.y + quad.height));
              break;            
            case 1:
              quad.sub({ x: 0.5, y: 0.5, z: 0.5 - reverse + greedyVoxels.boundingBox.z });
              geometry.vertices.push(new THREE.Vector3(quad.x,              quad.y,               quad.z));
              geometry.vertices.push(new THREE.Vector3(quad.x + quad.width, quad.y,               quad.z));
              geometry.vertices.push(new THREE.Vector3(quad.x + quad.width, quad.y + quad.height, quad.z));
              geometry.vertices.push(new THREE.Vector3(quad.x,              quad.y + quad.height, quad.z));
              break;
            case 2:
              quad.sub({ x: 0.5 - greedyVoxels.boundingBox.y, y: 0.5, z: 0.5 - reverse + greedyVoxels.boundingBox.x });
              geometry.vertices.push(new THREE.Vector3(quad.z, quad.y,               quad.x));
              geometry.vertices.push(new THREE.Vector3(quad.z, quad.y,               quad.x + quad.width));
              geometry.vertices.push(new THREE.Vector3(quad.z, quad.y + quad.height, quad.x + quad.width));
              geometry.vertices.push(new THREE.Vector3(quad.z, quad.y + quad.height, quad.x));
              break;
            default:
              break;
          }
          if((reverse && direction == 1) || (!reverse && direction != 1)) {
            geometry.faces.push(new THREE.Face3(0 + vertexOffset, 1 + vertexOffset, 2 + vertexOffset, null, quad.color));
            geometry.faces.push(new THREE.Face3(2 + vertexOffset, 3 + vertexOffset, 0 + vertexOffset, null, quad.color));
          } else {
            geometry.faces.push(new THREE.Face3(2 + vertexOffset, 1 + vertexOffset, 0 + vertexOffset, null, quad.color));
            geometry.faces.push(new THREE.Face3(0 + vertexOffset, 3 + vertexOffset, 2 + vertexOffset, null, quad.color));
          }
        }
      }
    }

    xy(0);
    xy(0, 1);

    xy(1);
    xy(1, 1);

    xy(2)
    xy(2, 1);

    geometry.computeFaceNormals();
    var voxelMaterial = new THREE.MeshPhongMaterial( {
      color: 0xffffff,
      flatShading: true,
      vertexColors: THREE.VertexColors,
      shininess: 0
    } );
    var wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
    let mesh = new THREE.Mesh(geometry, voxelMaterial);
    mesh.add(new THREE.Mesh(geometry, wireframeMaterial));
    // let mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());            
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.position.x = offset.x;
    mesh.position.y = offset.y;
    mesh.position.z = offset.z;
    this.scene.add(mesh);
    const duration = Date.now() - startTime;
    console.log(`Voxeled in ${duration}ms`);
  }
  render() {
    // Render rStats if Dev
    if (Config.isDev && Config.isShowingStats) {
      Stats.start();
    }

    // Call render function and pass in created scene and camera
    this.renderer.render(this.scene, this.camera.threeCamera);

    // rStats has finished determining render call now
    if (Config.isDev && Config.isShowingStats) {
      Stats.end();
    }

    // Delta time is sometimes needed for certain updates
    //const delta = this.clock.getDelta();

    // Call any vendor or module frame updates here
    TWEEN.update();
    this.controls.threeControls.update();

    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
