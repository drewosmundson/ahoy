// Game.js - Core game orchestrator with centralized projectile management
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { Terrain } from './components/Terrain.js';
import { Water } from './components/Water.js';
import { Boat } from './components/Boat.js';
import { Skybox } from './components/Skybox.js';
import { InputController } from './utils/InputController.js';
import { SoundManager } from './utils/SoundManager.js';
import { CameraController } from './utils/CameraController.js';
import { Projectile } from './components/Projectile.js';

export class Game {
  constructor(canvas, socket, multiplayer, heightmap, heightmapOverlay) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.waterLevel = 10;
    this.difficulty = 1;
    this.socket = socket;
    this.multiplayer = multiplayer;
    this.heightmap = heightmap;
    this.heightmapOverlay = heightmapOverlay;
    
    this.lastTime = 0;
    
    // Enemy boat management
    this.enemyBoats = new Map(); // Map of playerId -> boat instance
    
    // Centralized projectile management
    this.projectiles = []; // Player's own projectiles
  
    this.isAlive = true;
    
    this.initRenderer();
    this.initCamera();
    this.initSound();
    this.initLighting();
    this.initComponents();
    this.initMultiplayerEvents();
    
    window.addEventListener('resize', this.handleWindowResize);
    this.handleWindowResize();
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
    
    this.cameraController = new CameraController(this.camera, this.canvas);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
  }

  initComponents() {
    this.terrain = new Terrain(this.scene, this.socket, this.multiplayer, this.heightmap, this.heightmapOverlay);
    this.water = new Water(this.scene, this.waterLevel);
    this.boat = new Boat(this.scene, this.waterLevel, this.socket, this.multiplayer, this.terrain);
    this.skybox = new Skybox(this.scene);
    this.input = new InputController(this);
  }

  initMultiplayerEvents() {
    if (!this.socket) return;

    // Handle enemy boat movements
    this.socket.on('enemyBoatMovement', (data) => {
      this.updateEnemyBoat(data);
    });

    // Handle enemy projectiles
    this.socket.on('enemyProjectileFired', (data) => {
      this.enemyFiredProjectile(data);
    });

  }

  updateEnemyBoat(data) {
    const { playerId, position, rotation } = data;
    
    if (!this.enemyBoats.has(playerId)) {
      const enemyBoat = new Boat(this.scene, this.waterLevel, null, false, this.terrain);
      enemyBoat.setEnemyMode(true);
      this.enemyBoats.set(playerId, enemyBoat);
    }
    
    const enemyBoat = this.enemyBoats.get(playerId);
    enemyBoat.setPosition(position.x, position.y, position.z);
    enemyBoat.setRotation(rotation);
  }

  createProjectile(positionX, positionZ, rotation, sideOfBoat) {
    const projectile = new Projectile(
      this.scene,
      this.waterLevel,
      this.terrain,
      positionX,
      positionZ,
      rotation,
      sideOfBoat
    );
    this.projectiles.push(projectile);
  }

  enemyFiredProjectile(data) {
    const { position, rotation, sideOfBoat } = data;
    this.createProjectile(position.x, position.z, rotation, sideOfBoat);
  }

  playerFiredProjectile(sideOfBoat) {
    if (!this.isAlive || !this.socket) {
      return;
    }

    const position = this.boat.getPosition();
    const rotation = this.boat.getRotation(); // FIX: Use 'rotation' instead of undefined 'boatRotation'

    this.createProjectile(position.x, position.z, rotation, sideOfBoat);
    
    if (this.multiplayer) {
      this.socket.emit('projectileFired', {
        position: {
          x: position.x,
          z: position.z
        },
        rotation: rotation, // FIX: Use 'rotation' instead of undefined 'boatRotation'
        sideOfBoat,
        timestamp: Date.now() // Add timestamp for synchronization
      });
    }
  }

  updateProjectiles(deltaTime) {
    for (let i = 0; i < this.projectiles.length; i++) {
      const projectile = this.projectiles[i];
      
      if (!projectile.update(deltaTime) || !projectile.isProjectileActive()) {
        this.projectiles.splice(i, 1);
      }
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
    this.cameraController.toggleCameraMode();
  }
  
  toggleTerrainMode() {
    return this.terrain.toggleTerrainMode();
  }

  toggleMouseLook() {
    this.cameraController.toggleMouseLook();
  }

  lookRight() {
    this.cameraController.lookRight();
  }

  lookLeft() {
    this.cameraController.lookLeft();
  }

  playBackgroundMusic() {
    this.soundManager?.playSound('mainTheme', 0.05);
    this.soundManager?.playSound('ambient', 0.07);
  }

  playSoundEffect(name, volumeScale = 1.0) {
    this.soundManager?.playSound(name, volumeScale);
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
    const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
    this.lastTime = time;

    // Update all components
    this.water?.update(time);
    
    if (this.isAlive) {
      this.boat?.update(time, this.input.boatMovement, deltaTime);
    }
    
    // Update enemy boats
    for (const [playerId, enemyBoat] of this.enemyBoats) {
      enemyBoat.update(time, null, deltaTime);
    }
    
    // Update all projectiles (centralized)
    this.updateProjectiles(deltaTime);
    
    this.cameraController?.update(this.boat);
  }

  animate = (time) => {
    this.update(time);
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    this.renderer.setAnimationLoop(this.animate);
  }

  stop() {
    this.renderer.setAnimationLoop(null);
  }

  cleanup() {
    this.boat?.cleanup();
    this.cameraController?.cleanup();
    
    // Cleanup enemy boats
    for (const [playerId, enemyBoat] of this.enemyBoats) {
      enemyBoat.cleanup();
    }
    this.enemyBoats.clear();
    
    // Cleanup all projectiles
    this.projectiles.forEach(projectile => {
      if (projectile.isProjectileActive()) {
        projectile.destroy();
      }
    });
    this.projectiles = [];
    
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

    this.stop();
  }
}