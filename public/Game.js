// Game.js - Core game class with enhanced camera controls

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js';
import { Terrain } from './components/Terrain.js';
import { Water } from './components/Water.js';
import { Boat } from './components/Boat.js';
import { Skybox } from './components/Skybox.js';
import { InputController } from './utils/InputController.js';
import { SoundManager } from './utils/SoundManager.js';
import { Projectile } from './components/Projectile.js';

export class Game {
  constructor(canvas, socket, multiplayer, heightmap, heightmapOverlay) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.cameraMode = 'free';
    this.waterLevel = 10;
    this.difficulty = 1;
    this.projectile = null;

    this.projectiles = []; // Array to track multiple projectiles
    this.lastTime = 0; // For delta time calculation
    this.enemyProjectiles = {};

    this.enemyBoats = {};
    this.shouldEmitToServer = multiplayer;

    this.socket = socket;
    this.multiplayer = multiplayer;
    this.heightmap = heightmap;
    this.heightmapOverlay = heightmapOverlay;

    // FIX: Track event listeners to prevent duplicates
    this.eventListenersAdded = false;

    // NEW: Mouse look camera properties
    this.mouseX = 0;
    this.mouseY = 0;
    this.cameraYaw = 0;   // Horizontal rotation
    this.cameraPitch = 0; // Vertical rotation
    this.mouseSensitivity = 0.002; // Adjust this value to change sensitivity
    this.isPointerLocked = false;
    this.maxPitch = Math.PI / 2 - 0.1; // Prevent camera from flipping

    this.initRenderer();
    this.initCamera();
    this.initSound();
    this.initLighting();
    this.initControls();
    this.initMouseLook(); // NEW: Initialize mouse look

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

    if (this.multiplayer && !this.eventListenersAdded) {
      this.setupSocketListeners();
      this.eventListenersAdded = true;
    }
  }

  // NEW: Initialize mouse look functionality
  initMouseLook() {
    // Add click listener to canvas to request pointer lock
    this.canvas.addEventListener('click', () => {
      this.requestPointerLock();
    });

    // Listen for pointer lock changes
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      if (this.isPointerLocked) {
        console.log('Pointer locked - mouse look enabled');
      } else {
        console.log('Pointer unlocked - mouse look disabled');
      }
    });

    // Listen for mouse movement
    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        this.handleMouseMove(event);
      }
    });

    // ESC key to exit pointer lock
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isPointerLocked) {
        document.exitPointerLock();
      }
    });
  }

  // NEW: Request pointer lock
  requestPointerLock() {
    this.canvas.requestPointerLock();
  }

  // NEW: Handle mouse movement for camera rotation
  handleMouseMove(event) {
    if (!this.isPointerLocked) return;

    // Get mouse movement delta
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update camera rotation based on mouse movement
    this.cameraYaw -= movementX * this.mouseSensitivity;

    this.cameraPitch += movementY * this.mouseSensitivity * 0.5;
    if(this.cameraPitch >= 0.2) {
      this.cameraPitch = 0.2;
    }
    if(this.cameraPitch <= -0.2){
      this.cameraPitch = -0.2;
    }
    // Clamp pitch to prevent camera flipping
    this.cameraPitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.cameraPitch));
  }

    setupSocketListeners() {
      // Remove any existing listeners first
      this.socket.off('playerUpdate');
      this.socket.off('enemyProjectileFired');
      
      this.socket.on('playerUpdate', (data) => {
        this.updateEnemyBoatPosition(data);
      });

      // Handle enemy projectile firing
      this.socket.on('enemyProjectileFired', (data) => {
        this.handleEnemyProjectileFired(data);
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

  // Helper function for linear interpolation
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // Helper function for angular interpolation (shortest path)
  lerpAngle(start, end, factor) {
    let diff = end - start;
    // Normalize to [-π, π]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return start + diff * factor;
  }

  handleMultiPlayerJoin() {
    this.socket.on('playerJoin', (data) => {
      const enemyBoat = new Boat(this.scene, this.waterLevel);
      // Initialize interpolation data
      this.enemyBoats[data.id] = {
        boat: enemyBoat,
        targetPos: { x: data.position.x, z: data.position.z },
        targetRot: data.rotation,
        startPos: { x: data.position.x, z: data.position.z },
        startRot: data.rotation,
        lerpStartTime: Date.now(),
        lerpDuration: 100 // 100ms interpolation time
      };
    });
  }
  handleEnemyProjectileFired(data) {
    console.log('Enemy projectile fired:', data);
    
    // Create enemy projectile
    const enemyProjectile = new Projectile(
      this.scene, 
      this.socket, 
      this.waterLevel, 
      this.terrain, 
      data.position.x, 
      data.position.z
    );
    
    // Set launch position and direction
    enemyProjectile.setPositionAndRotation(
      data.position.x,
      data.position.y,
      data.position.z,
      data.rotation,
      data.sideOfBoat
    );

    // Add to projectiles array so it gets updated
    this.projectiles.push(enemyProjectile);
    
    // Store reference with player ID for potential cleanup
    if (!this.enemyProjectiles[data.playerId]) {
      this.enemyProjectiles[data.playerId] = [];
    }
    this.enemyProjectiles[data.playerId].push(enemyProjectile);
  }

  updateEnemyBoatPosition(data) {
    const { playerId, position, rotation } = data;

    // Don't update our own boat
    if (playerId === this.socket.id) return;

    const currentTime = Date.now();

    // Check if the enemy boat already exists
    if (this.enemyBoats[playerId]) {
      const enemyData = this.enemyBoats[playerId];
      const enemyBoat = enemyData.boat;
      
      // Store current position as start position for interpolation
      enemyData.startPos = {
        x: enemyBoat.model.position.x,
        z: enemyBoat.model.position.z
      };
      enemyData.startRot = enemyBoat.model.rotation.y;
      
      // Set new target position
      enemyData.targetPos = { x: position.x, z: position.z };
      enemyData.targetRot = rotation;
      enemyData.lerpStartTime = currentTime;
      
    } else {
      // If the enemy boat doesn't exist, create it
      const enemyBoat = new Boat(this.scene, this.waterLevel);
      enemyBoat.model.position.set(position.x, this.waterLevel, position.z);
      enemyBoat.model.rotation.y = rotation;
      this.scene.add(enemyBoat.model);
      
      // Initialize interpolation data
      this.enemyBoats[playerId] = {
        boat: enemyBoat,
        targetPos: { x: position.x, z: position.z },
        targetRot: rotation,
        startPos: { x: position.x, z: position.z },
        startRot: rotation,
        lerpStartTime: currentTime,
        lerpDuration: 100 // 100ms interpolation time
      };
    }
  }

  // NEW: Update enemy boat interpolation
  updateEnemyBoatInterpolation() {
    const currentTime = Date.now();
    
    Object.values(this.enemyBoats).forEach(enemyData => {
      const { boat, targetPos, targetRot, startPos, startRot, lerpStartTime, lerpDuration } = enemyData;
      
      // Calculate interpolation factor (0 to 1)
      const elapsed = currentTime - lerpStartTime;
      const factor = Math.min(elapsed / lerpDuration, 1.0);
      
      // Apply easing for smoother movement (optional)
      const easedFactor = factor * factor * (3.0 - 2.0 * factor); // Smoothstep
      
      // Interpolate position
      const newX = this.lerp(startPos.x, targetPos.x, easedFactor);
      const newZ = this.lerp(startPos.z, targetPos.z, easedFactor);
      boat.model.position.set(newX, this.waterLevel, newZ);
      
      // Interpolate rotation
      const newRotY = this.lerpAngle(startRot, targetRot, easedFactor);
      boat.model.rotation.y = newRotY;
    });
  }


  // Update the fireProjectile method:
  fireProjectile(sideOfBoat) {
    if (!this.boat) return;
    if (!this.socket) {
      console.warn('Socket not initialized, cannot fire projectile');
      return;
    }

    // Create new projectile
    const projectile = new Projectile(
      this.scene, 
      this.socket, 
      this.waterLevel, 
      this.terrain, 
      this.boat.model.position.x, 
      this.boat.model.position.z
    );
    
    // Set launch position and direction
    projectile.setPositionAndRotation(
      this.boat.model.position.x,
      this.waterLevel + 2, // Launch from slightly above water
      this.boat.model.position.z,
      this.boat.model.rotation.y,
      sideOfBoat
    );

    // Add to projectiles array
    this.projectiles.push(projectile);

    // Optional: Emit projectile fired event for multiplayer
    this.socket.emit('projectileFired', {
      position: {
        x: this.boat.model.position.x,
        y: this.waterLevel + 2,
        z: this.boat.model.position.z
      },
      rotation: this.boat.model.rotation.y,
      timestamp: Date.now(),
      sideOfBoat
    });
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

  // ENHANCED: Updated camera system with mouse look support
  updateCamera() {
    if (this.cameraMode === 'follow' && this.boat) {
      const boatPos = this.boat.model.position;
      const boatRot = this.boat.model.rotation.y;
      if (this.isPointerLocked) {
        // Mouse look camera - rotate around boat based on mouse input
        const distance = 10;
        const height = 5;
        
        // Calculate camera position based on yaw and pitch
        const x = boatPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * distance;
        const y = boatPos.y + Math.sin(this.cameraPitch) * distance + height;
        const z = boatPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * distance;
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(boatPos);
      } else {
        // Original follow camera behavior
        const distance = 10;
        const height = 5;
        const x = boatPos.x - Math.sin(boatRot) * distance;
        const z = boatPos.z - Math.cos(boatRot) * distance;

        this.camera.position.set(x, this.waterLevel + height, z);
        this.camera.lookAt(boatPos);
      }
    }
  }

  // NEW: Method to toggle mouse look
  toggleMouseLook() {
    if (this.isPointerLocked) {
      document.exitPointerLock();
    } else {
      this.requestPointerLock();
    }
  }

  // NEW: Reset camera rotation
  resetCameraRotation() {
    this.cameraYaw = 0;
    this.cameraPitch = 0;
  }

  lookRight() {
    // Can be used for keyboard camera rotation if needed
    if (!this.isPointerLocked) {
      this.cameraRotationX += 0.1;
    }
  }

  lookLeft() {
    // Can be used for keyboard camera rotation if needed
    if (!this.isPointerLocked) {
      this.cameraRotationX -= 0.1;
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

// Update the main update method to include projectile updates:
update(time) {
  // Calculate delta time
  const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
  this.lastTime = time;

  this.water?.update(time);
  this.boat?.update(time, this.input.boatMovement, this.terrain);
  this.updateCamera();

  // Update projectiles
  this.updateProjectiles(deltaTime);

  // Update enemy boat interpolation
  this.updateEnemyBoatInterpolation();

  // Only use OrbitControls when not in pointer lock mode and in free camera mode
  if (this.controls?.enabled && !this.isPointerLocked && this.cameraMode === 'free') {
    this.controls.update();
  }

  // Throttled multiplayer updates (existing code remains the same)
  if (this.multiplayer) {
    const now = Date.now();
    
    const positionChanged = 
      Math.abs(this.lastBoatPositionX - this.boat.model.position.x) > 1 ||
      Math.abs(this.lastBoatPositionZ - this.boat.model.position.z) > 1 ||
      Math.abs(this.lastBoatRotationY - this.boat.model.rotation.y) > 1;

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

// Add this new method to handle projectile updates:
updateProjectiles(deltaTime) {
  // Update all active projectiles
  for (let i = this.projectiles.length - 1; i >= 0; i--) {
    const projectile = this.projectiles[i];
    
    // Update projectile physics
    const stillActive = projectile.update(deltaTime);
    
    // Remove inactive projectiles from array
    if (!stillActive || !projectile.isProjectileActive()) {
      this.projectiles.splice(i, 1);
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

  // Update the cleanup method to include enemy projectiles:
  cleanup() {
    // Clean up all projectiles (including enemy projectiles)
    this.projectiles.forEach(projectile => {
      if (projectile.isProjectileActive()) {
        projectile.destroy();
      }
    });
    this.projectiles = [];

    // Clean up enemy projectiles tracking
    Object.keys(this.enemyProjectiles).forEach(playerId => {
      this.enemyProjectiles[playerId].forEach(projectile => {
        if (projectile.isProjectileActive()) {
          projectile.destroy();
        }
      });
    });
    this.enemyProjectiles = {};

    // Exit pointer lock if active
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }

    // Remove event listeners
    if (this.socket && this.eventListenersAdded) {
      this.socket.off('playerUpdate');
      this.socket.off('enemyProjectileFired');
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