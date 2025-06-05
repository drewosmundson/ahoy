// Game.js - Core game class
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js';
import { Terrain } from './components/Terrain.js';
import { Water } from './components/Water.js';
import { Boat } from './components/Boat.js';
import { Skybox } from './components/Skybox.js';
import { InputController } from './utils/InputController.js';
import { SoundManager } from './utils/SoundManager.js';

export class Game {
  constructor(canvas, socket, multiplayer, heightmap, heightmapOverlay) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.cameraMode = 'free';
    this.waterLevel = 10;
    this.difficulty = 1;
    
    this.enemyBoats = {};
    this.shouldEmitToServer = multiplayer;

    this.socket = socket;
    this.multiplayer = multiplayer;
    this.heightmap = heightmap;
    this.heightmapOverlay = heightmapOverlay;

    // FIX: Track event listeners to prevent duplicates
    this.eventListenersAdded = false;

    this.initRenderer();
    this.initCamera();
    this.initSound();
    this.initLighting();
    this.initControls();

    this.terrain = new Terrain(this.scene, this.socket, this.multiplayer, this.heightmap, this.heightmapOverlay);
    this.water = new Water(this.scene, this.waterLevel);
    this.boat = new Boat(this.scene, this.waterLevel, this.socket);
    this.skybox = new Skybox(this.scene);
    this.input = new InputController(this);

    this.lastBoatPositionX = this.boat.model.position.x;
    this.lastBoatPositionZ = this.boat.model.position.z;
    this.lastBoatRotationY = this.boat.model.rotation.y;

    // FIX: Throttle position updates
    this.lastEmitTime = 0;
    this.emitInterval = 50; // Emit every 50ms instead of every frame

    window.addEventListener('resize', this.handleWindowResize);
    this.handleWindowResize();

    // FIX: Only add socket listeners once
    if (this.multiplayer && !this.eventListenersAdded) {
      this.setupSocketListeners();
      this.eventListenersAdded = true;
    }
  }

  // FIX: Separate method for socket listeners
  setupSocketListeners() {
    // Remove any existing listeners first
    this.socket.off('playerUpdate');
    
    this.socket.on('playerUpdate', (data) => {
      this.updateEnemyBoatPosition(data);
    });
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  initCamera() {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 50);
    this.camera.lookAt(0, 0, 0);
  }

  initSound() {
    this.soundManager = new SoundManager(this.camera);
    this.soundManager.loadSoundEffect('mainTheme', 'resources/sounds/Lost_Sheep_Compressed.mp3');
    this.soundManager.loadSoundEffect('ambient', 'resources/sounds/waves.mp3');
    this.playBackgroundMusic();
  }

  initLighting() {
    const directionalLight = new THREE.DirectionalLight(0xFFF5EE, 1);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.5;
    this.controls.update();
  }

  handleMultiPlayerJoin() {
    this.socket.on('playerJoin', (data) => {
      const enemyBoat = new Boat(this.scene, this.waterLevel);
      enemyBoat.model.position.set(data.position.x, this.waterLevel, data.position.z);
      enemyBoat.model.rotation.y = data.rotation;
      this.scene.add(enemyBoat.model);
      this.enemyBoats[data.id] = enemyBoat;
    });
  }

  updateEnemyBoatPosition(data) {
    const { playerId, position, rotation } = data;

    // Don't update our own boat
    if (playerId === this.socket.id) return;

    // Check if the enemy boat already exists
    if (this.enemyBoats[playerId]) {
      const enemyBoat = this.enemyBoats[playerId];
      enemyBoat.model.position.set(position.x, this.waterLevel, position.z);
      enemyBoat.model.rotation.y = rotation;
    } else {
      // If the enemy boat doesn't exist, create it
      const enemyBoat = new Boat(this.scene, this.waterLevel);
      enemyBoat.model.position.set(position.x, this.waterLevel, position.z);
      enemyBoat.model.rotation.y = rotation;
      this.scene.add(enemyBoat.model);
      this.enemyBoats[playerId] = enemyBoat;
    }
  }

  toggleFog() {
    if (this.scene.fog) {
      this.scene.fog = null;
    } else {
      this.scene.fog = new THREE.FogExp2(0xF7F4E9, 0.008);
    }
  }

  toggleCameraMode() {
    if (this.cameraMode === 'free') {
      this.cameraMode = 'follow';
      this.controls.enabled = false;
      this.freeCameraPosition = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone()
      };
    } else {
      this.cameraMode = 'free';
      this.controls.enabled = true;
      if (this.freeCameraPosition) {
        this.camera.position.copy(this.freeCameraPosition.position);
        this.controls.target.copy(this.freeCameraPosition.target);
        this.controls.update();
      }
    }
  }
  
  toggleTerrainMode() {
    return this.terrain.toggleTerrainMode();
  }

  playBackgroundMusic() {
    this.soundManager?.playSound('mainTheme', 0.05);
    this.soundManager?.playSound('ambient', 0.07);
  }

  playSoundEffect(name, volumeScale = 1.0) {
    this.soundManager?.playSound(name, volumeScale);
  }

  updateCamera() {
    if (this.cameraMode === 'follow' && this.boat) {
      const boatPos = this.boat.model.position;
      const boatRot = this.boat.model.rotation.y;

      const distance = 10;
      const height = 5;
      const x = boatPos.x - Math.sin(boatRot) * distance;
      const z = boatPos.z - Math.cos(boatRot) * distance;

      this.camera.position.set(x, this.waterLevel + height, z);
      this.camera.lookAt(boatPos);
    }
  }

  handleWindowResize = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let width = windowWidth;
    let height = (width * 9) / 16;

    if (height > windowHeight) {
      height = windowHeight;
      width = (height * 16) / 9;
    }

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(time) {
    this.water?.update(time);
    this.boat?.update(time, this.input.boatMovement, this.terrain);
    this.updateCamera();

    if (this.controls?.enabled) {
      this.controls.update();
    }

    // FIX: Throttled multiplayer updates
    if (this.multiplayer) {
      const now = Date.now();
      
      // Check if position changed significantly
      const positionChanged = 
        Math.abs(this.lastBoatPositionX - this.boat.model.position.x) > 0.5 ||
        Math.abs(this.lastBoatPositionZ - this.boat.model.position.z) > 0.5 ||
        Math.abs(this.lastBoatRotationY - this.boat.model.rotation.y) > 0.2;

      // Only emit if position changed and enough time has passed
      if (positionChanged && (now - this.lastEmitTime) > this.emitInterval) {
        this.lastBoatPositionX = this.boat.model.position.x;
        this.lastBoatPositionZ = this.boat.model.position.z;
        this.lastBoatRotationY = this.boat.model.rotation.y;
        this.lastEmitTime = now;

        this.socket.emit('playerUpdate', {
          id: this.socket.id,
          position: {
            x: this.boat.model.position.x,
            z: this.boat.model.position.z
          },
          rotation: this.boat.model.rotation.y
        });
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  animate = (time) => {
    this.update(time);
    this.render();
  }

  start() {
    this.renderer.setAnimationLoop(this.animate);
  }

  stop() {
    this.renderer.setAnimationLoop(null);
  }

  // FIX: Clean up method
  cleanup() {
    // Remove event listeners
    if (this.socket && this.eventListenersAdded) {
      this.socket.off('playerUpdate');
      this.eventListenersAdded = false;
    }

    // Clean up Three.js objects
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    // Stop animation loop
    this.stop();
  }
}