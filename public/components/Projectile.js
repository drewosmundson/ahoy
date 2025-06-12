// Projectile.js - Handles projectile creation and physics with hit detection
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Projectile {
  constructor(scene, socket, waterLevel, terrain, boatPositionX, boatPositionZ, game) {
    this.scene = scene; 
    this.socket = socket;
    this.waterLevel = waterLevel;
    this.terrain = terrain;
    this.game = game; // Reference to game instance for accessing other boats
    
    // Physics properties
    this.initialSpeed = 25; // Initial launch speed
    this.launchAngle = Math.PI / 9; // 30 degrees launch angle
    this.gravity = 9.8; // Gravity acceleration
    
    // Velocity components
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
    
    // Time tracking
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    
    // Launch direction (will be set when firing)
    this.launchDirection = 0;
    
    // Hit detection properties
    this.hitRadius = 2.0; // Radius for hit detection
    this.damage = 25; // Damage dealt on hit
    
    // Create projectile model
    this.model = this.createProjectileModel();
    
    // Set initial position
    this.model.position.set(boatPositionX, waterLevel, boatPositionZ);
    
    // Add to scene
    this.scene.add(this.model);
    
    // Flag to track if projectile is active
    this.isActive = true;
  }
  
  createProjectileModel() {
    // Create group to hold all parts
    const projectile = new THREE.Group();
    
    // Create cannonball sphere
    const sphereGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2F2F2F,
      metalness: 0.8,
      roughness: 0.2
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    projectile.add(sphereMesh);
    
    return projectile;
  }
  
  setPositionAndRotation(x, y, z, rotation, sideOfBoat) {
    if (!this.model) return;
    
    // Set position
    this.model.position.set(x, y, z);
    
    // Store launch direction for physics calculations
    this.launchDirection = rotation + sideOfBoat
    
    // Calculate initial velocity components
    this.velocityX = Math.sin(this.launchDirection) * this.initialSpeed * Math.cos(this.launchAngle);
    this.velocityY = this.initialSpeed * Math.sin(this.launchAngle);
    this.velocityZ = Math.cos(this.launchDirection) * this.initialSpeed * Math.cos(this.launchAngle);
  }
  
  checkBoatCollisions() {
    if (!this.game || !this.game.boat) return null;
    
    const projectilePos = this.model.position;
    
    // Check collision with local player's boat
    const localBoatPos = this.game.boat.getPosition();
    const distanceToLocal = projectilePos.distanceTo(localBoatPos);
    
    if (distanceToLocal <= this.hitRadius) {
      return {
        type: 'local',
        boat: this.game.boat,
        distance: distanceToLocal
      };
    }
    
    // Check collision with enemy boats
    if (this.game.enemyBoats) {
      for (const [playerId, enemyBoat] of this.game.enemyBoats) {
        const enemyBoatPos = enemyBoat.getPosition();
        const distanceToEnemy = projectilePos.distanceTo(enemyBoatPos);
        
        if (distanceToEnemy <= this.hitRadius) {
          return {
            type: 'enemy',
            boat: enemyBoat,
            playerId: playerId,
            distance: distanceToEnemy
          };
        }
      }
    }
    
    return null;
  }
  
  handleBoatHit(hitInfo) {
    console.log(`Projectile hit ${hitInfo.type} boat!`);
    
    // Apply damage to the hit boat
    if (hitInfo.boat && typeof hitInfo.boat.takeDamage === 'function') {
      hitInfo.boat.takeDamage(this.damage);
    }
    
    // Emit hit event to server
    if (this.socket && this.socket.connected) {
      this.socket.emit('projectileHit', {
        hitType: hitInfo.type,
        targetPlayerId: hitInfo.playerId || 'local',
        damage: this.damage,
        hitPosition: {
          x: this.model.position.x,
          y: this.model.position.y,
          z: this.model.position.z
        },
        timestamp: Date.now()
      });
    }
    
    // Create hit effect (explosion, particles, etc.)
    this.createHitEffect();
    
    // Destroy the projectile
    this.destroy();
  }
  
  createHitEffect() {
    // Create a simple explosion effect
    const explosionGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF4500,
      transparent: true,
      opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.model.position);
    
    this.scene.add(explosion);
    
    // Animate explosion (fade out and scale up)
    const startTime = Date.now();
    const duration = 500; // 500ms
    
    const animateExplosion = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(explosion);
        explosion.geometry.dispose();
        explosion.material.dispose();
        return;
      }
      
      // Scale up and fade out
      const scale = 1 + progress * 2;
      explosion.scale.set(scale, scale, scale);
      explosion.material.opacity = 0.8 * (1 - progress);
      
      requestAnimationFrame(animateExplosion);
    };
    
    animateExplosion();
  }
  
  update(deltaTime) {
    if (!this.model || !this.isActive) return false;
    
    // Convert deltaTime from milliseconds to seconds
    const dt = deltaTime * 0.001;
    
    // Apply gravity to vertical velocity
    this.velocityY -= this.gravity * dt;
    
    // Update position based on velocity
    this.model.position.x += this.velocityX * dt;
    this.model.position.y += this.velocityY * dt;
    this.model.position.z += this.velocityZ * dt;
    
    // Get current position
    const currentPos = this.model.position;
    
    // Check for boat collisions first (before terrain/water)
    const hitInfo = this.checkBoatCollisions();
    if (hitInfo) {
      this.handleBoatHit(hitInfo);
      return false;
    }
    
    // Check if projectile has hit water level
    if (currentPos.y <= this.waterLevel) {
      console.log('Projectile hit water!');
      this.createWaterSplash();
      this.destroy();
      return false;
    }
    
    // Check if projectile has hit terrain
    const terrainHeight = this.terrain.getHeightAt(currentPos.x, currentPos.z);
    if (currentPos.y <= terrainHeight) {
      console.log('Projectile hit terrain!');
      this.createTerrainImpact();
      this.destroy();
      return false;
    }
    
    // Check if projectile is out of bounds (optional)
    const maxDistance = 500;
    if (Math.abs(currentPos.x) > maxDistance || Math.abs(currentPos.z) > maxDistance) {
      console.log('Projectile out of bounds!');
      this.destroy();
      return false;
    }
    
    // Add some rotation for visual effect
    this.model.rotation.x += 0.1;
    this.model.rotation.z += 0.05;
    
    return true; // Projectile is still active
  }
  
  createWaterSplash() {
    // Create water splash effect
    const splashGeometry = new THREE.CylinderGeometry(0.5, 2, 3, 8);
    const splashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4169E1,
      transparent: true,
      opacity: 0.9
    });
    const splash = new THREE.Mesh(splashGeometry, splashMaterial);
    splash.position.set(this.model.position.x, this.waterLevel, this.model.position.z);
    
    this.scene.add(splash);
    
    // Animate splash
    const startTime = Date.now();
    const duration = 800;
    
    const animateSplash = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(splash);
        splash.geometry.dispose();
        splash.material.dispose();
        return;
      }
      
      // Scale up and fade out
      const scale = 1 + progress * 1.5;
      splash.scale.set(scale, 1 + progress * 2, scale);
      splash.material.opacity = 0.6 * (1 - progress);
      
      requestAnimationFrame(animateSplash);
    };
    
    animateSplash();
  }
  
  createTerrainImpact() {
    // Create terrain impact effect (dust cloud)
    const dustGeometry = new THREE.SphereGeometry(1, 8, 8);
    const dustMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x8B4513,
      transparent: true,
      opacity: 0.9
    });
    const dust = new THREE.Mesh(dustGeometry, dustMaterial);
    dust.position.copy(this.model.position);
    
    this.scene.add(dust);
    
    // Animate dust cloud
    const startTime = Date.now();
    const duration = 600;
    
    const animateDust = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(dust);
        dust.geometry.dispose();
        dust.material.dispose();
        return;
      }
      
      // Scale up and fade out
      const scale = 1 + progress * 3;
      dust.scale.set(scale, scale, scale);
      dust.material.opacity = 0.5 * (1 - progress);
      dust.position.y += 0.1; // Dust rises
      
      requestAnimationFrame(animateDust);
    };
    
    animateDust();
  }
  
  destroy() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove from scene
    if (this.scene && this.model) {
      this.scene.remove(this.model);
      
      // Dispose of geometry and materials
      this.model.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    // Optional: Emit destruction event for multiplayer
    if (this.socket && this.socket.connected) {
      this.socket.emit('projectileDestroyed', {
        position: {
          x: this.model.position.x,
          y: this.model.position.y,
          z: this.model.position.z
        }
      });
    }
  }
  
  // Get current position for collision detection with other objects
  getPosition() {
    return this.model ? this.model.position.clone() : new THREE.Vector3();
  }
  
  // Check if projectile is still active
  isProjectileActive() {
    return this.isActive;
  }
}