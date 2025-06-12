// Game.js - Core game orchestrator with enemy boat management

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
    this.enemyProjectiles = new Map(); // Map of projectileId -> projectile instance
    
    // Player health
    this.playerHealth = 100;
    this.maxPlayerHealth = 100;
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
    this.soundManager.loadSoundEffect('hit', 'resources/sounds/explosion.mp3');
    this.soundManager.loadSoundEffect('death', 'resources/sounds/death.mp3');
    this.playBackgroundMusic();
  }

  initLighting() {
    const directionalLight = new THREE.DirectionalLight(0xFFF5EE, 1);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
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
      this.createEnemyProjectile(data);
    });

    // Handle player hits
    this.socket.on('playerHit', (data) => {
      this.handlePlayerHit(data);
    });

    // Handle player deaths
    this.socket.on('playerKilled', (data) => {
      this.handlePlayerKilled(data);
    });

    // Handle player healing
    this.socket.on('playerHealed', (data) => {
      this.handlePlayerHealed(data);
    });

    // Handle game over
    this.socket.on('gameOver', (data) => {
      this.handleGameOver(data);
    });
  }

  updateEnemyBoat(data) {
    const { playerId, position, rotation } = data;
    
    if (!this.enemyBoats.has(playerId)) {
      // Create new enemy boat
      const enemyBoat = new Boat(this.scene, this.waterLevel, null, false, this.terrain);
      enemyBoat.setEnemyMode(true); // Set as enemy boat
      this.enemyBoats.set(playerId, enemyBoat);
    }
    
    const enemyBoat = this.enemyBoats.get(playerId);
    enemyBoat.setPosition(position.x, position.y, position.z);
    enemyBoat.setRotation(rotation);
  }

  createEnemyProjectile(data) {
    const { playerId, position, rotation, sideOfBoat, timestamp } = data;
    
    // Create enemy projectile
    const projectile = new Projectile(
      this.scene, 
      null, // No socket for enemy projectiles
      this.waterLevel, 
      this.terrain, 
      position.x, 
      position.z,
      this
    );
    
    projectile.setPositionAndRotation(position.x, position.y, position.z, rotation, sideOfBoat);
    
    // Store projectile with unique ID
    const projectileId = `${playerId}_${timestamp}`;
    this.enemyProjectiles.set(projectileId, projectile);
    
    console.log(`Enemy projectile created from player ${playerId}`);
  }

  handlePlayerHit(data) {
    const { attackerPlayerId, targetPlayerId, damage, newHealth, hitPosition } = data;
    
    // Update local health if we were hit
    if (targetPlayerId === this.socket.id) {
      this.playerHealth = newHealth;
      this.showDamageIndicator(damage);
      this.playSoundEffect('hit', 0.5);
      
      // Screen shake effect
      this.cameraController.addShake(0.5, 300);
    }
    
    // Update enemy boat health if they were hit
    if (this.enemyBoats.has(targetPlayerId)) {
      const enemyBoat = this.enemyBoats.get(targetPlayerId);
      enemyBoat.setHealth(newHealth);
    }
    
    // Create hit effect at impact location
    this.createHitEffect(hitPosition);
    
    console.log(`Player ${targetPlayerId} hit by ${attackerPlayerId} for ${damage} damage`);
  }

  handlePlayerKilled(data) {
    const { killedPlayerId, killerPlayerId } = data;
    
    if (killedPlayerId === this.socket.id) {
      // Local player was killed
      this.isAlive = false;
      this.playerHealth = 0;
      this.showDeathScreen();
      this.playSoundEffect('death', 0.7);
    }
    
    // Remove enemy boat if they were killed
    if (this.enemyBoats.has(killedPlayerId)) {
      const enemyBoat = this.enemyBoats.get(killedPlayerId);
      enemyBoat.destroy();
      this.enemyBoats.delete(killedPlayerId);
    }
    
    console.log(`Player ${killedPlayerId} was killed by ${killerPlayerId}`);
  }

  handlePlayerHealed(data) {
    const { playerId, healAmount, newHealth } = data;
    
    if (playerId === this.socket.id) {
      this.playerHealth = newHealth;
      this.showHealIndicator(healAmount);
    }
    
    if (this.enemyBoats.has(playerId)) {
      const enemyBoat = this.enemyBoats.get(playerId);
      enemyBoat.setHealth(newHealth);
    }
  }

  handleGameOver(data) {
    const { winner } = data;
    
    if (winner && winner.id === this.socket.id) {
      this.showVictoryScreen();
    } else {
      this.showDefeatScreen();
    }
  }

  createHitEffect(position) {
    // Create explosion effect at hit location
    const explosionGeometry = new THREE.SphereGeometry(2, 12, 12);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF4500,
      transparent: true,
      opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.set(position.x, position.y, position.z);
    
    this.scene.add(explosion);
    
    // Animate explosion
    const startTime = Date.now();
    const duration = 600;
    
    const animateExplosion = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(explosion);
        explosion.geometry.dispose();
        explosion.material.dispose();
        return;
      }
      
      const scale = 1 + progress * 3;
      explosion.scale.set(scale, scale, scale);
      explosion.material.opacity = 0.8 * (1 - progress);
      
      requestAnimationFrame(animateExplosion);
    };
    
    animateExplosion();
  }

  showDamageIndicator(damage) {
    // Create red screen flash effect
    const damageOverlay = document.createElement('div');
    damageOverlay.style.position = 'fixed';
    damageOverlay.style.top = '0';
    damageOverlay.style.left = '0';
    damageOverlay.style.width = '100%';
    damageOverlay.style.height = '100%';
    damageOverlay.style.background = 'rgba(255, 0, 0, 0.3)';
    damageOverlay.style.pointerEvents = 'none';
    damageOverlay.style.zIndex = '1000';
    
    document.body.appendChild(damageOverlay);
    
    // Fade out damage indicator
    setTimeout(() => {
      damageOverlay.style.transition = 'opacity 0.5s';
      damageOverlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(damageOverlay);
      }, 500);
    }, 100);
    
    // Show damage text
    console.log(`Took ${damage} damage! Health: ${this.playerHealth}`);
  }

  showHealIndicator(healAmount) {
    console.log(`Healed ${healAmount} health! Health: ${this.playerHealth}`);
  }

  showDeathScreen() {
    console.log('You have been defeated!');
    // TODO: Implement death screen UI
  }

  showVictoryScreen() {
    console.log('Victory! You are the last boat standing!');
    // TODO: Implement victory screen UI
  }

  showDefeatScreen() {
    console.log('Game Over! Another player won.');
    // TODO: Implement defeat screen UI
  }

  // Simplified methods that delegate to other classes
  fireProjectile(sideOfBoat) {
    if (this.isAlive) {
      this.boat.fireProjectile(sideOfBoat);
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
    
    // Update enemy projectiles
    for (const [projectileId, projectile] of this.enemyProjectiles) {
      if (!projectile.update(deltaTime)) {
        // Projectile is destroyed, remove it
        this.enemyProjectiles.delete(projectileId);
      }
    }
    
    this.cameraController?.update(this.boat);
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

  cleanup() {
    this.boat?.cleanup();
    this.cameraController?.cleanup();
    
    // Cleanup enemy boats
    for (const [playerId, enemyBoat] of this.enemyBoats) {
      enemyBoat.cleanup();
    }
    this.enemyBoats.clear();
    
    // Cleanup enemy projectiles
    for (const [projectileId, projectile] of this.enemyProjectiles) {
      projectile.destroy();
    }
    this.enemyProjectiles.clear();

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