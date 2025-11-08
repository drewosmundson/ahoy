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
    this.enemyBoats = {};
    this.projectiles = []; // Player's own projectiles
    this.enemyProjectiles = [];

    this.isAlive = true;

    this.initRenderer();
    this.initCamera();
    this.initSound();
    this.initLighting();
    this.initComponents();
 
    if (this.multiplayer && this.socket) {
      this.initMultiplayerEvents();
    }
    if(!this.multiplayer) {
      this.initEnemyAI();
    }


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

    this.socket.off('boatDestroyed');
    this.socket.on('boatDestroyed', (data) => {
      this.boatDestroyed(data);
    })

    // Handle enemy projectiles
    this.socket.off('enemyProjectileFired');
    this.socket.on('enemyProjectileFired', (data) => {
      this.enemyFiredProjectile(data);
    });
    // Clean up existing listeners
    // change to enemy boat update location
    this.socket.off('playerUpdate');
    this.socket.on('playerUpdate', (data) => {
      this.updateEnemyBoatPosition(data);
    });
  }
  initEnemyAI() {

    return;
  }


  updateEnemyBoatInterpolation() {
    const currentTime = Date.now();
    
    Object.entries(this.enemyBoats).forEach(([playerId, enemyData]) => {
      const { boat, targetPos, targetRot, startPos, startRot, lerpStartTime, lerpDuration } = enemyData;
      
      if (!boat || !boat.model) {
        console.warn(`Enemy boat for ${playerId} is missing model`);
        return;
      }
      
      const elapsed = currentTime - lerpStartTime;
      const factor = Math.min(elapsed / lerpDuration, 1.0);
      const easedFactor = factor * factor * (3.0 - 2.0 * factor);
      
      const newX = boat.lerp(startPos.x, targetPos.x, easedFactor);
      const newZ = boat.lerp(startPos.z, targetPos.z, easedFactor);
      boat.model.position.set(newX, this.waterLevel, newZ);
      
      const newRotY = boat.lerpAngle(startRot, targetRot, easedFactor);
      boat.model.rotation.y = newRotY;
    });
  }




  updateEnemyBoatPosition(data) {
    const { playerId, position, rotation } = data;
    
    // Don't update our own boat
    if (playerId === this.socket.id) return;
    
    console.log(`Updating enemy boat ${playerId} to position:`, position, 'rotation:', rotation);
    
    const currentTime = Date.now();
    
    if (this.enemyBoats[playerId]) {
      // Update existing enemy boat
      const enemyData = this.enemyBoats[playerId];
      const enemyBoat = enemyData.boat;
      
      enemyData.startPos = {
        x: enemyBoat.model.position.x,
        z: enemyBoat.model.position.z
      };
      enemyData.startRot = enemyBoat.model.rotation.y;
      
      enemyData.targetPos = { x: position.x, z: position.z };
      enemyData.targetRot = rotation;
      enemyData.lerpStartTime = currentTime;
      
    } else {
      // Create new enemy boat
      console.log(`Creating new enemy boat for player ${playerId}`);
      
      const enemyBoat = new Boat(this.scene, this.waterLevel, null, false, null);
      enemyBoat.model.position.set(position.x, this.waterLevel, position.z);
      enemyBoat.model.rotation.y = rotation;
      
      // Make enemy boats visually distinct (different colored sail)
      const sail = enemyBoat.model.children.find(child => 
        child.material && child.material.color && child.material.color.getHex() === 0xFFFFFF
      );
      if (sail) {
        sail.material = sail.material.clone();
        sail.material.color.setHex(0xFF6B6B); // Red sail for enemy boats
      }
      
      this.enemyBoats[playerId] = {
        boat: enemyBoat,
        targetPos: { x: position.x, z: position.z },
        targetRot: rotation,
        startPos: { x: position.x, z: position.z },
        startRot: rotation,
        lerpStartTime: currentTime,
        lerpDuration: 100
      };

      console.log(`Enemy boat created for ${playerId}. Total enemy boats:`, Object.keys(this.enemyBoats).length);
    }
  }
  boatDestroyed(data) {
    this.boat.createDeathEffect(data.position);
    
  }

  enemyFiredProjectile(data) {
    const { position, rotation, sideOfBoat } = data;
    const enemyProjectile = new Projectile(
      this.scene,
      this.waterLevel,
      this.terrain,
      position.x,
      position.z,
      rotation,
      sideOfBoat
    );
    this.enemyProjectiles.push(enemyProjectile);
  }

  playerFiredProjectile(sideOfBoat) {

    if (!this.isAlive || !this.socket) {
      return;
    }
    const position = this.boat.getPosition();
    const rotation = this.boat.getRotation();
    const projectile = new Projectile(
      this.scene,
      this.waterLevel,
      this.terrain,
      position.x,
      position.z,
      rotation,
      sideOfBoat
    );
    this.projectiles.push(projectile);
    if (this.multiplayer) {
      this.socket.emit('projectileFired', {
        position: {
          x: position.x,
          z: position.z
        },
        rotation: rotation, 
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
  // Game.js - Fixed collision detection to prevent double hits
  updateEnemyProjectiles(deltaTime) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const enemyProjectile = this.enemyProjectiles[i];
      
      // Check collision BEFORE updating projectile
      const collisionDetected = this.boat.checkEnemyProjectileCollision(enemyProjectile);
      
      // If collision was detected, remove projectile immediately
      if (collisionDetected) {
        this.enemyProjectiles.splice(i, 1);
        continue; // Skip to next projectile
      }
      
      // Update projectile if no collision
      if (!enemyProjectile.update(deltaTime) || !enemyProjectile.isProjectileActive()) {
        this.enemyProjectiles.splice(i, 1);
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
  this.updateEnemyBoatInterpolation();
  this.updateProjectiles(deltaTime);
  this.updateEnemyProjectiles(deltaTime); 


  
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