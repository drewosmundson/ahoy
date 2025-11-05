// Boat.js - Fixed boat class with proper respawn mechanics
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Boat {
  constructor(scene, waterLevel, socket = null, multiplayer = false, terrain = null) {
    this.scene = scene; 
    this.waterLevel = waterLevel;
    this.socket = socket;
    this.multiplayer = multiplayer;
    this.terrain = terrain;
    
    // Movement properties
    this.speed = 0.2;
    this.rotationSpeed = 0.03;
    
    // Health properties
    this.health = 100;
    this.maxHealth = 100;
    this.isAlive = true;
    this.isRespawning = false;
    this.respawnTime = 5000; // 5 seconds respawn time
    this.respawnStartTime = 0;
    
    // Multiplayer properties
    this.lastEmitTime = 0;
    this.emitInterval = 50;
    this.lastPosition = { x: 0, z: 0 };
    this.lastRotation = 0;
    this.eventListenersAdded = false;
    
    // Enemy boat flag
    this.isEnemyBoat = false;
    
    // Create boat model
    this.model = this.createBoatModel();
    
    // Only set random position for the main player boat
    if (this.socket && this.terrain) {
      this.setRandomPosition();
    } else {
      // For enemy boats, position will be set externally
      this.model.position.set(0, this.waterLevel, 0);
    }
    
    this.scene.add(this.model);
  }
  
  createBoatModel() {
    const boat = new THREE.Group();
    
    // Create boat hull
    const hullGeometry = new THREE.BoxGeometry(3, 1, 6);
    const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 0.5;
    boat.add(hull);

    // Create boat cabin
    const cabinGeometry = new THREE.BoxGeometry(2, 1, 2);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 1, -1.5);
    boat.add(cabin);
    
    // Create cannons
    const cannonGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x000420 });
    
    const cannonLeft = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannonLeft.position.set(1.5, 1, 0);
    cannonLeft.rotation.z = Math.PI / 2;
    cannonLeft.rotation.z = 5;
    boat.add(cannonLeft);
    
    const cannonRight = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannonRight.position.set(-1.5, 1, 0);
    cannonRight.rotation.z = Math.PI / 2;
    cannonRight.rotation.z = -5;
    boat.add(cannonRight);
    
    // Create mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 3, 0);
    boat.add(mast);
    
    // Create sail
    const sailGeometry = new THREE.PlaneGeometry(2, 3);
    const sailMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.rotation.y = Math.PI;
    sail.position.set(0, 3, 0);
    boat.add(sail);
    
    return boat;
  }

  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getPosition() {
    return this.model ? this.model.position.clone() : new THREE.Vector3();
  }

  getRotation() {
    return this.model ? this.model.rotation.y : 0;
  }

  setEnemyMode(isEnemy) {
    this.isEnemyBoat = isEnemy;
    if (isEnemy && this.model) {
      // Change boat color to red for enemies
      this.model.traverse((child) => {
        if (child.material && child.material.color) {
          child.material.color.setHex(0xFF4444);
        }
      });
    }
  }

  setPosition(x, y, z) {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  setRotation(rotation) {
    if (this.model) {
      this.model.rotation.y = rotation;
    }
  }

  setHealth(newHealth) {
    this.health = Math.max(0, Math.min(this.maxHealth, newHealth));
  }

  getHealth() {
    return this.health;
  }

  isBoatAlive() {
    return this.isAlive;
  }

  isBoatRespawning() {
    return this.isRespawning;
  }

  getRespawnTimeRemaining() {
    if (!this.isRespawning) return 0;
    const elapsed = Date.now() - this.respawnStartTime;
    return Math.max(0, this.respawnTime - elapsed);
  }

  setRandomPosition() {
    const maxIteration = 100;
    let positionFound = false;
    
    for (let i = 0; i < maxIteration; i++) {
      const x = this.getRandomNumber(-200, 200);
      const z = this.getRandomNumber(-200, 200);
      
      if (this.terrain.getHeightAt(x, z) < this.waterLevel - 2) {
        this.model.position.set(x, this.waterLevel, z);
        positionFound = true;
        break;
      }
    }
    
    if (!positionFound) {
      // fallback position if no suitable terrain was found
      this.model.position.set(0, this.waterLevel, 0);
    }
  }

  checkEnemyProjectileCollision(projectile) {
    if (!this.model || !projectile || !projectile.isProjectileActive() || !this.isAlive) {
      return false;
    }

    const boatPosition = this.model.position;
    const projectilePosition = projectile.getPosition();

    // Check distance between boat and projectile
    const distance = boatPosition.distanceTo(projectilePosition);
    
    // More reasonable collision radius (boat hull is 3x6 units)
    const collisionRadius = 9; 
    
    if (distance < collisionRadius) {
      // Destroy projectile immediately
      projectile.createHitEffect();
      projectile.destroy();
      
      // Apply damage to this boat
      this.takeDamage(25);

      // debuging delete later
      if (this.socket && this.multiplayer) {
        this.socket.emit('debug', {
          message: 'Projectile hit',
          damage: 25,
          health: this.health
        });
        
        // Also emit a more specific hit event
        this.socket.emit('boatHit', {
          targetPlayerId: this.socket.id,
          damage: 25,
          hitPosition: {
            x: boatPosition.x,
            y: boatPosition.y,
            z: boatPosition.z
          }
        });
      }
      
      return true; // Return true to indicate collision occurred
    }
    
    return false; // No collision
  }

  takeDamage(amount = 25) {
    if (!this.isAlive) return; // Don't take damage if already dead
    
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.startRespawnProcess();
      
      // Emit boat destroyed event for multiplayer
      if (this.socket && this.multiplayer) {
        this.socket.emit('boatDestroyed', {
          playerId: this.socket.id,
          timestamp: Date.now()
        });
      }
    } else {
      // Visual damage indicator for non-fatal hits
      this.showDamageEffect();
    }
  }

  startRespawnProcess() {
    console.log('Starting respawn process for boat');
    this.isAlive = false;
    this.isRespawning = true;
    this.respawnStartTime = Date.now();
    
    // Hide the boat model but don't destroy it
    if (this.model) {
      this.model.visible = false;
    }
    
    // Create death effect
    this.createDeathEffect();
    
    // Start respawn timer
    setTimeout(() => {
      this.respawnBoat();
    }, this.respawnTime);
  }

  createDeathEffect() {
    if (!this.model) return;
    
    const position = this.model.position.clone();
    
    // Create explosion effect
    const explosionGeometry = new THREE.SphereGeometry(5, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF4500,
      transparent: true,
      opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    
    this.scene.add(explosion);
    
    // Create smoke particles
    for (let i = 0; i < 12; i++) {
      const smokeGeometry = new THREE.SphereGeometry(1, 8, 8);
      const smokeMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.6
      });
      const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
      
      smoke.position.copy(position);
      smoke.position.x += (Math.random() - 0.5) * 10;
      smoke.position.z += (Math.random() - 0.5) * 10;
      
      this.scene.add(smoke);
      
      // Animate smoke
      const startTime = Date.now();
      const duration = 3000;
      
      const animateSmoke = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          this.scene.remove(smoke);
          smoke.geometry.dispose();
          smoke.material.dispose();
          return;
        }
        
        smoke.position.y += 0.05;
        smoke.scale.set(1 + progress * 2, 1 + progress * 2, 1 + progress * 2);
        smoke.material.opacity = 0.6 * (1 - progress);
        
        requestAnimationFrame(animateSmoke);
      };
      
      animateSmoke();
    }
    
    // Animate explosion
    const startTime = Date.now();
    const duration = 1000;
    
    const animateExplosion = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(explosion);
        explosion.geometry.dispose();
        explosion.material.dispose();
        return;
      }
      
      const scale = 1 + progress * 4;
      explosion.scale.set(scale, scale, scale);
      explosion.material.opacity = 0.8 * (1 - progress);
      
      requestAnimationFrame(animateExplosion);
    };
    
    animateExplosion();
  }

  respawnBoat() {
    console.log('Respawning boat');
    
    // Reset health and status
    this.health = this.maxHealth;
    this.isAlive = true;
    this.isRespawning = false;
    
    // Find new random position
    if (this.terrain) {
      this.setRandomPosition();
    }
    
    // Show the boat model again
    if (this.model) {
      this.model.visible = true;
      
      // Create respawn effect
      const position = this.model.position.clone();
      this.createRespawnEffect(position);
      
      // Reset boat appearance (remove any damage effects)
      this.resetBoatAppearance();
    }

    // Emit respawn event for multiplayer
    if (this.socket && this.multiplayer) {
      this.socket.emit('playerRespawned', {
        playerId: this.socket.id,
        position: {
          x: this.model.position.x,
          z: this.model.position.z
        },
        rotation: this.model.rotation.y,
        timestamp: Date.now()
      });
    }
  }

  createRespawnEffect(position) {
    if (!this.model) return;

    // Create golden light effect
    const lightGeometry = new THREE.SphereGeometry(4, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.copy(position);
    
    this.scene.add(light);
    
    // Create sparkle particles
    for (let i = 0; i < 8; i++) {
      const sparkleGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const sparkleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
      });
      const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
      
      sparkle.position.copy(position);
      sparkle.position.x += (Math.random() - 0.5) * 8;
      sparkle.position.y += Math.random() * 8;
      sparkle.position.z += (Math.random() - 0.5) * 8;
      
      this.scene.add(sparkle);
      
      // Animate sparkles
      const startTime = Date.now();
      const duration = 1500;
      
      const animateSparkle = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          this.scene.remove(sparkle);
          sparkle.geometry.dispose();
          sparkle.material.dispose();
          return;
        }
        
        sparkle.rotation.x += 0.1;
        sparkle.rotation.y += 0.1;
        sparkle.material.opacity = 0.8 * (1 - progress);
        
        requestAnimationFrame(animateSparkle);
      };
      
      animateSparkle();
    }
    
    // Animate light effect
    const startTime = Date.now();
    const duration = 2000;
    
    const animateLight = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(light);
        light.geometry.dispose();
        light.material.dispose();
        return;
      }
      
      const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
      light.scale.set(scale, scale, scale);
      light.material.opacity = 0.6 * (1 - progress);
      
      requestAnimationFrame(animateLight);
    };
    
    animateLight();
  }

  resetBoatAppearance() {
    if (!this.model) return;
    
    // Reset all materials to original colors
    this.model.traverse((child) => {
      if (child.material && child.material.color) {
        // Reset to original colors based on the boat part
        if (child.geometry && child.geometry.type === 'BoxGeometry') {
          if (child.position.y > 0.8) { // Cabin
            child.material.color.setHex(0xA0522D);
          } else { // Hull
            child.material.color.setHex(0x8B4513);
          }
        } else if (child.geometry && child.geometry.type === 'PlaneGeometry') { // Sail
          child.material.color.setHex(0xFFFFFF);
        } else if (child.geometry && child.geometry.type === 'CylinderGeometry') {
          if (child.position.y > 2) { // Mast
            child.material.color.setHex(0x8B4513);
          } else { // Cannons
            child.material.color.setHex(0x000420);
          }
        }
      }
    });
  }

  showDamageEffect() {
    // Create a brief red flash effect
    if (this.model) {

    }
  }

  emitPositionUpdate() {
    if (!this.multiplayer || !this.socket || !this.isAlive) return;
    
    const now = Date.now();
    const positionChanged = 
      Math.abs(this.lastPosition.x - this.model.position.x) > 0.5 ||
      Math.abs(this.lastPosition.z - this.model.position.z) > 0.5 ||
      Math.abs(this.lastRotation - this.model.rotation.y) > 0.1;

    if (positionChanged && (now - this.lastEmitTime) > this.emitInterval) {
      this.lastPosition.x = this.model.position.x;
      this.lastPosition.z = this.model.position.z;
      this.lastRotation = this.model.rotation.y;
      this.lastEmitTime = now;

      this.socket.emit('playerUpdate', {
        id: this.socket.id,
        position: {
          x: this.model.position.x,
          z: this.model.position.z
        },
        rotation: this.model.rotation.y,
        isAlive: this.isAlive,
        health: this.health
      });
    }
  }

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  lerpAngle(start, end, factor) {
    let diff = end - start;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return start + diff * factor;
  }

  setPositionAndRotation(x, y, z, rotation) {
    if (!this.model) return;
    this.model.position.set(x, y, z);
    this.model.rotation.y = rotation;
  }

  update(time, movement, deltaTime) {
    if (!this.model) return;
    
    // Handle respawn countdown display or other respawn logic
    if (this.isRespawning) {
      // You can add UI updates here to show respawn timer
      return;
    }
    
    // Only update movement if boat is alive
    if (!this.isAlive) return;
    
    const position = this.model.position;
    const rotation = this.model.rotation.y;
    
    let deltaX = 0;
    let deltaZ = 0;
    
    // Handle movement input
    if (movement) {
      if (movement.forward) {
        deltaX += Math.sin(rotation) * this.speed;
        deltaZ += Math.cos(rotation) * this.speed;
      }
      if (movement.backward) {
        deltaX -= Math.sin(rotation) * this.speed * 0.5;
        deltaZ -= Math.cos(rotation) * this.speed * 0.5;
      }
      
      if (movement.left) {
        this.model.rotation.y += this.rotationSpeed;
      }
      if (movement.right) {
        this.model.rotation.y -= this.rotationSpeed;
      }
    }
    
    // Calculate new position
    const newX = position.x + deltaX;
    const newZ = position.z + deltaZ;

    // Check map boundaries
    const mapBounds = 450;
    if (Math.abs(newX) < mapBounds && Math.abs(newZ) < mapBounds) {
      // Check terrain collision
      const terrainHeight = this.terrain ? this.terrain.getHeightAt(newX, newZ) : -999;

      if (terrainHeight < this.waterLevel) {
        position.x = newX;
        position.z = newZ;
        
        // Apply wave animation
        const waveHeight = 0.7;
        const waveFrequency = 0.09;
        const timeScale = time * 0.001;
        const noiseX = Math.sin(timeScale + newX * waveFrequency) * 0.5;
        const noiseZ = Math.cos(timeScale + newZ * waveFrequency) * 0.5;
        const noiseValue = (noiseX + noiseZ) * 0.5;
        
        this.model.position.y = this.waterLevel - 0.3 + noiseValue * waveHeight;
        this.model.rotation.x = noiseValue * 0.1;
        this.model.rotation.z = noiseValue * 0.1;
      }
    }
    
    this.emitPositionUpdate();
    this.model.rotation.y = this.model.rotation.y % (2 * Math.PI);
  }

  // Method to destroy this boat instance (permanent cleanup)
  destroy() {
    if (this.model) {
      this.scene.remove(this.model);
      
      // Dispose of geometries and materials
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
      
      this.model = null;
    }
  }

  cleanup() {
    // Remove socket listeners
    if (this.socket && this.eventListenersAdded) {
      this.socket.off('playerUpdate');
      this.eventListenersAdded = false;
    }

    // Destroy the boat model
    this.destroy();
  }
}