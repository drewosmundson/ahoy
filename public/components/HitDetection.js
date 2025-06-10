// HitDetection.js - Comprehensive hit detection system
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class HitDetection {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.hitEffects = [];
    
    // Hit detection settings
    this.boatHitRadius = 4; // Radius around boat center for hit detection
    this.explosionRadius = 8; // Radius of explosion effect
    this.damageRadius = 12; // Radius for damage calculation
    
    // Visual effects settings
    this.explosionDuration = 1000; // milliseconds
    this.hitFlashDuration = 200; // milliseconds
  }

  // Main hit detection update method
  update(deltaTime) {
    this.checkProjectileHits();
    this.updateHitEffects(deltaTime);
  }

  // Check all projectiles for hits
  checkProjectileHits() {
    for (let i = this.game.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.game.projectiles[i];
      
      if (!projectile.isProjectileActive()) continue;

      const projectilePos = projectile.getPosition();
      
      // Check hit against player's boat
      if (this.checkBoatHit(projectilePos, this.game.boat)) {
        this.handleBoatHit(this.game.boat, projectilePos, projectile);
        this.game.projectiles.splice(i, 1);
        continue;
      }

      // Check hit against enemy boats
      let hitDetected = false;
      for (const [playerId, enemyData] of Object.entries(this.game.enemyBoats)) {
        if (this.checkBoatHit(projectilePos, enemyData.boat)) {
          this.handleEnemyBoatHit(enemyData.boat, projectilePos, projectile, playerId);
          this.game.projectiles.splice(i, 1);
          hitDetected = true;
          break;
        }
      }

      if (hitDetected) continue;

      // Check terrain/water impact
      if (this.checkTerrainHit(projectilePos, projectile)) {
        this.handleTerrainHit(projectilePos, projectile);
        this.game.projectiles.splice(i, 1);
      }
    }
  }

  // Check if projectile hits a boat
  checkBoatHit(projectilePos, boat) {
    if (!boat || !boat.model) return false;

    const boatPos = boat.model.position;
    const distance = projectilePos.distanceTo(boatPos);
    
    return distance <= this.boatHitRadius;
  }

  // Check if projectile hits terrain or water
  checkTerrainHit(projectilePos, projectile) {
    // Check if projectile is below water level
    if (projectilePos.y <= this.game.waterLevel) {
      return true;
    }

    // Check if projectile hits terrain
    const terrainHeight = this.game.terrain.getHeightAt(projectilePos.x, projectilePos.z);
    if (projectilePos.y <= terrainHeight) {
      return true;
    }

    return false;
  }

  // Handle hit on player's boat
  handleBoatHit(boat, hitPosition, projectile) {
    console.log('Player boat hit!');
    
    // Create explosion effect
    this.createExplosionEffect(hitPosition);
    
    // Apply damage to boat
    this.applyBoatDamage(boat, hitPosition);
    
    // Create hit flash effect
    this.createHitFlash(boat);
    
    // Play hit sound
    this.game.playSoundEffect('hit', 0.3);
    
    // Emit hit event for multiplayer
    if (this.game.multiplayer && this.game.socket) {
      this.game.socket.emit('boatHit', {
        position: hitPosition,
        damage: this.calculateDamage(hitPosition, boat.model.position),
        timestamp: Date.now()
      });
    }
  }

  // Handle hit on enemy boat
  handleEnemyBoatHit(boat, hitPosition, projectile, playerId) {
    console.log(`Enemy boat hit: ${playerId}`);
    
    // Create explosion effect
    this.createExplosionEffect(hitPosition);
    
    // Create hit flash effect
    this.createHitFlash(boat);
    
    // Play hit sound
    this.game.playSoundEffect('hit', 0.2);
    
    // Emit hit event for multiplayer
    if (this.game.multiplayer && this.game.socket) {
      this.game.socket.emit('enemyBoatHit', {
        targetPlayerId: playerId,
        position: hitPosition,
        damage: this.calculateDamage(hitPosition, boat.model.position),
        timestamp: Date.now()
      });
    }
  }

  // Handle terrain/water impact
  handleTerrainHit(hitPosition, projectile) {
    console.log('Projectile hit terrain/water');
    
    // Create splash effect for water hits
    if (hitPosition.y <= this.game.waterLevel + 1) {
      this.createSplashEffect(hitPosition);
    } else {
      // Create dust/debris effect for terrain hits
      this.createDebrisEffect(hitPosition);
    }
    
    // Play impact sound
    this.game.playSoundEffect('impact', 0.15);
  }

  // Calculate damage based on distance from hit point
  calculateDamage(hitPosition, targetPosition) {
    const distance = hitPosition.distanceTo(targetPosition);
    const maxDamage = 25;
    const minDamage = 5;
    
    // Damage decreases with distance
    const damageFactor = Math.max(0, 1 - (distance / this.damageRadius));
    return Math.floor(minDamage + (maxDamage - minDamage) * damageFactor);
  }

  // Apply damage to boat (can be extended for health system)
  applyBoatDamage(boat, hitPosition) {
    // Initialize health if not exists
    if (!boat.health) {
      boat.health = 100;
      boat.maxHealth = 100;
    }
    
    const damage = this.calculateDamage(hitPosition, boat.model.position);
    boat.health = Math.max(0, boat.health - damage);
    
    console.log(`Boat health: ${boat.health}/${boat.maxHealth}`);
    
    // Check if boat is destroyed
    if (boat.health <= 0) {
      this.handleBoatDestroyed(boat);
    }
    
    // Update UI health bar (if exists)
    this.updateHealthUI(boat);
  }

  // Handle boat destruction
  handleBoatDestroyed(boat) {
    console.log('Boat destroyed!');
    
    // Create destruction effect
    this.createDestructionEffect(boat.model.position);
    
    // Play destruction sound
    this.game.playSoundEffect('destruction', 0.4);
    
    // Hide boat model or replace with wreckage
    boat.model.visible = false;
    
    // Emit destruction event for multiplayer
    if (this.game.multiplayer && this.game.socket) {
      this.game.socket.emit('boatDestroyed', {
        position: boat.model.position,
        timestamp: Date.now()
      });
    }
  }

  // Create explosion visual effect
  createExplosionEffect(position) {
    const explosionGeometry = new THREE.SphereGeometry(2, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    this.scene.add(explosion);
    
    // Animate explosion expansion and fade
    const startTime = Date.now();
    const hitEffect = {
      mesh: explosion,
      startTime: startTime,
      duration: this.explosionDuration,
      type: 'explosion',
      initialScale: 1,
      maxScale: 3
    };
    
    this.hitEffects.push(hitEffect);
  }

  // Create water splash effect
  createSplashEffect(position) {
    const splashGeometry = new THREE.ConeGeometry(1, 3, 8);
    const splashMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6
    });
    
    const splash = new THREE.Mesh(splashGeometry, splashMaterial);
    splash.position.copy(position);
    splash.position.y = this.game.waterLevel;
    this.scene.add(splash);
    
    const startTime = Date.now();
    const hitEffect = {
      mesh: splash,
      startTime: startTime,
      duration: 800,
      type: 'splash',
      initialScale: 0.5,
      maxScale: 2
    };
    
    this.hitEffects.push(hitEffect);
  }

  // Create debris effect for terrain hits
  createDebrisEffect(position) {
    const debrisGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const debrisMaterial = new THREE.MeshBasicMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.7
    });
    
    // Create multiple debris pieces
    for (let i = 0; i < 5; i++) {
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      debris.position.copy(position);
      debris.position.x += (Math.random() - 0.5) * 4;
      debris.position.z += (Math.random() - 0.5) * 4;
      debris.position.y += Math.random() * 2;
      this.scene.add(debris);
      
      const startTime = Date.now();
      const hitEffect = {
        mesh: debris,
        startTime: startTime,
        duration: 1500,
        type: 'debris',
        velocity: {
          x: (Math.random() - 0.5) * 0.1,
          y: Math.random() * 0.1,
          z: (Math.random() - 0.5) * 0.1
        }
      };
      
      this.hitEffects.push(hitEffect);
    }
  }

  // Create hit flash effect on boat
  createHitFlash(boat) {
    if (!boat.model) return;
    
    const originalMaterials = [];
    
    // Store original materials and apply red flash
    boat.model.traverse((child) => {
      if (child.isMesh) {
        originalMaterials.push({
          mesh: child,
          material: child.material
        });
        
        child.material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.7
        });
      }
    });
    
    // Restore original materials after flash duration
    setTimeout(() => {
      originalMaterials.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
    }, this.hitFlashDuration);
  }

  // Create destruction effect
  createDestructionEffect(position) {
    // Create multiple explosion particles
    for (let i = 0; i < 8; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 6;
      particle.position.z += (Math.random() - 0.5) * 6;
      particle.position.y += Math.random() * 4;
      this.scene.add(particle);
      
      const startTime = Date.now();
      const hitEffect = {
        mesh: particle,
        startTime: startTime,
        duration: 2000,
        type: 'destruction',
        velocity: {
          x: (Math.random() - 0.5) * 0.2,
          y: Math.random() * 0.15,
          z: (Math.random() - 0.5) * 0.2
        },
        gravity: -0.005
      };
      
      this.hitEffects.push(hitEffect);
    }
  }

  // Update all visual hit effects
  updateHitEffects(deltaTime) {
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const effect = this.hitEffects[i];
      const elapsed = Date.now() - effect.startTime;
      const progress = elapsed / effect.duration;
      
      if (progress >= 1.0) {
        // Remove completed effect
        this.scene.remove(effect.mesh);
        this.hitEffects.splice(i, 1);
        continue;
      }
      
      // Update effect based on type
      switch (effect.type) {
        case 'explosion':
          this.updateExplosionEffect(effect, progress);
          break;
        case 'splash':
          this.updateSplashEffect(effect, progress);
          break;
        case 'debris':
          this.updateDebrisEffect(effect, progress, deltaTime);
          break;
        case 'destruction':
          this.updateDestructionEffect(effect, progress, deltaTime);
          break;
      }
    }
  }

  // Update explosion effect animation
  updateExplosionEffect(effect, progress) {
    const scale = effect.initialScale + (effect.maxScale - effect.initialScale) * progress;
    effect.mesh.scale.setScalar(scale);
    effect.mesh.material.opacity = 0.8 * (1 - progress);
  }

  // Update splash effect animation
  updateSplashEffect(effect, progress) {
    const scale = effect.initialScale + (effect.maxScale - effect.initialScale) * progress;
    effect.mesh.scale.setScalar(scale);
    effect.mesh.material.opacity = 0.6 * (1 - progress);
    effect.mesh.position.y += 0.05; // Rise up
  }

  // Update debris effect animation
  updateDebrisEffect(effect, progress, deltaTime) {
    effect.mesh.position.x += effect.velocity.x * deltaTime;
    effect.mesh.position.y += effect.velocity.y * deltaTime;
    effect.mesh.position.z += effect.velocity.z * deltaTime;
    
    // Apply gravity
    effect.velocity.y -= 0.001 * deltaTime;
    
    effect.mesh.material.opacity = 0.7 * (1 - progress);
    effect.mesh.rotation.x += 0.01;
    effect.mesh.rotation.y += 0.01;
  }

  // Update destruction effect animation
  updateDestructionEffect(effect, progress, deltaTime) {
    effect.mesh.position.x += effect.velocity.x * deltaTime;
    effect.mesh.position.y += effect.velocity.y * deltaTime;
    effect.mesh.position.z += effect.velocity.z * deltaTime;
    
    // Apply gravity
    effect.velocity.y += effect.gravity * deltaTime;
    
    effect.mesh.material.opacity = 0.8 * (1 - progress);
    effect.mesh.rotation.x += 0.02;
    effect.mesh.rotation.y += 0.02;
  }

  // Update health UI (placeholder - implement based on your UI system)
  updateHealthUI(boat) {
    // Example implementation - you'll need to adapt this to your UI
    const healthPercentage = (boat.health / boat.maxHealth) * 100;
    
    // Update health bar element if it exists
    const healthBar = document.getElementById('healthBar');
    if (healthBar) {
      healthBar.style.width = `${healthPercentage}%`;
      healthBar.style.backgroundColor = healthPercentage > 50 ? 'green' : 
                                       healthPercentage > 25 ? 'yellow' : 'red';
    }
    
    // Update health text if it exists
    const healthText = document.getElementById('healthText');
    if (healthText) {
      healthText.textContent = `${boat.health}/${boat.maxHealth}`;
    }
  }

  // Clean up all hit effects
  cleanup() {
    this.hitEffects.forEach(effect => {
      this.scene.remove(effect.mesh);
    });
    this.hitEffects = [];
  }
}