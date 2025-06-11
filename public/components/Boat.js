// Boat.js - Enhanced boat with multiplayer and projectile management
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { Projectile } from './Projectile.js';

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

    // Projectile management
    this.projectiles = [];
    
    // Multiplayer properties
    this.enemyBoats = {};
    this.enemyProjectiles = {};
    this.lastEmitTime = 0;
    this.emitInterval = 50;
    this.lastPosition = { x: 0, z: 0 };
    this.lastRotation = 0;
    this.eventListenersAdded = false;

    // Create boat model
    this.model = this.createBoatModel();
    
    // Only set random position for the main player boat
    if (this.socket && this.terrain) {
      this.setBoatPosition();
    } else {
      // For enemy boats, position will be set externally
      this.model.position.set(0, this.waterLevel, 0);
    }
    
    this.scene.add(this.model);

    if (this.multiplayer && this.socket && !this.eventListenersAdded) {
      this.setupMultiplayerListeners();
      this.eventListenersAdded = true;
    }
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
    cannonLeft.position.set(1.5, 1, 1);
    cannonLeft.rotation.z = Math.PI / 2;
    cannonLeft.rotation.z = 5;
    boat.add(cannonLeft);
    
    const cannonRight = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannonRight.position.set(-1.5, 1, 1);
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

  setBoatPosition() {
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

  setupMultiplayerListeners() {
    // Clean up existing listeners
    this.socket.off('playerUpdate');
    this.socket.off('enemyProjectileFired');
    
    this.socket.on('playerUpdate', (data) => {
      console.log('Received playerUpdate:', data);
      this.updateEnemyBoatPosition(data);
    });

    this.socket.on('enemyProjectileFired', (data) => {
      console.log('Received enemyProjectileFired:', data);
      this.handleEnemyProjectileFired(data);
    });
  }

  fireProjectile(sideOfBoat) {
    if (!this.socket) {
      console.warn('Socket not initialized, cannot fire projectile');
      return;
    }

    const projectile = new Projectile(
      this.scene, 
      this.socket, 
      this.waterLevel, 
      this.terrain, 
      this.model.position.x, 
      this.model.position.z
    );
    
    projectile.setPositionAndRotation(
      this.model.position.x,
      this.waterLevel + 1,
      this.model.position.z,
      this.model.rotation.y,
      sideOfBoat
    );

    this.projectiles.push(projectile);

    if (this.multiplayer) {
      this.socket.emit('projectileFired', {
        position: {
          x: this.model.position.x,
          y: this.waterLevel + 1,
          z: this.model.position.z
        },
        rotation: this.model.rotation.y,
        timestamp: Date.now(),
        sideOfBoat
      });
    }
  }

  handleEnemyProjectileFired(data) {
    console.log('Creating enemy projectile:', data);
    
    const enemyProjectile = new Projectile(
      this.scene, 
      null, // Enemy projectiles don't need socket
      this.waterLevel, 
      this.terrain, 
      data.position.x, 
      data.position.z
    );
    
    enemyProjectile.setPositionAndRotation(
      data.position.x,
      data.position.y,
      data.position.z,
      data.rotation,
      data.sideOfBoat
    );

    this.projectiles.push(enemyProjectile);
    
    if (!this.enemyProjectiles[data.playerId]) {
      this.enemyProjectiles[data.playerId] = [];
    }
    this.enemyProjectiles[data.playerId].push(enemyProjectile);
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
      
      const newX = this.lerp(startPos.x, targetPos.x, easedFactor);
      const newZ = this.lerp(startPos.z, targetPos.z, easedFactor);
      boat.model.position.set(newX, this.waterLevel, newZ);
      
      const newRotY = this.lerpAngle(startRot, targetRot, easedFactor);
      boat.model.rotation.y = newRotY;
    });
  }

  updateProjectiles(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      
      const stillActive = projectile.update(deltaTime);
      
      if (!stillActive || !projectile.isProjectileActive()) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  emitPositionUpdate() {
    if (!this.multiplayer || !this.socket) return;

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
        rotation: this.model.rotation.y
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
    
    const position = this.model.position;
    const rotation = this.model.rotation.y;
    
    let deltaX = 0;
    let deltaZ = 0;
    
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
    
    const newX = position.x + deltaX;
    const newZ = position.z + deltaZ;

    const mapBounds = 450;
    if (Math.abs(newX) < mapBounds && Math.abs(newZ) < mapBounds) {
      const terrainHeight = this.terrain ? this.terrain.getHeightAt(newX, newZ) : -999;

      if (terrainHeight < this.waterLevel) {
        position.x = newX;
        position.z = newZ;
        
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

    // Update projectiles and multiplayer components
    this.updateProjectiles(deltaTime);
    this.updateEnemyBoatInterpolation();
    this.emitPositionUpdate();
  }

  // Method to remove a specific enemy boat (useful for when players disconnect)
  removeEnemyBoat(playerId) {
    if (this.enemyBoats[playerId]) {
      const enemyData = this.enemyBoats[playerId];
      if (enemyData.boat && enemyData.boat.model) {
        this.scene.remove(enemyData.boat.model);
        enemyData.boat.cleanup();
      }
      delete this.enemyBoats[playerId];
      console.log(`Removed enemy boat for player ${playerId}`);
    }
  }

  cleanup() {
    // Clean up own projectiles
    this.projectiles.forEach(projectile => {
      if (projectile.isProjectileActive()) {
        projectile.destroy();
      }
    });
    this.projectiles = [];

    // Clean up enemy projectiles
    Object.keys(this.enemyProjectiles).forEach(playerId => {
      this.enemyProjectiles[playerId].forEach(projectile => {
        if (projectile.isProjectileActive()) {
          projectile.destroy();
        }
      });
    });
    this.enemyProjectiles = {};

    // Clean up enemy boats
    Object.keys(this.enemyBoats).forEach(playerId => {
      this.removeEnemyBoat(playerId);
    });

    // Remove socket listeners
    if (this.socket && this.eventListenersAdded) {
      this.socket.off('playerUpdate');
      this.socket.off('enemyProjectileFired');
      this.eventListenersAdded = false;
    }
  }
}