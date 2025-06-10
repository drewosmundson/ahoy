// Projectile.js - Handles projectile creation and physics
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Projectile {
  constructor(scene, socket, waterLevel, terrain, boatPositionX, boatPositionZ) {
    this.scene = scene; 
    this.socket = socket;
    this.waterLevel = waterLevel;
    this.terrain = terrain;
    
    // Physics properties
    this.initialSpeed = 25; // Initial launch speed
    this.launchAngle = Math.PI / 8; // 30 degrees launch angle
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
    
    // Create projectile model
    this.model = this.createProjectileModel();
    
    // Set initial position
    this.model.position.set(boatPositionX, waterLevel + 0.5, boatPositionZ);
    
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
    this.launchDirection = rotation + sideOfBoat;
    
    // Calculate initial velocity components
    this.velocityX = Math.sin(this.launchDirection) * this.initialSpeed * Math.cos(this.launchAngle);
    this.velocityY = this.initialSpeed * Math.sin(this.launchAngle);
    this.velocityZ = Math.cos(this.launchDirection) * this.initialSpeed * Math.cos(this.launchAngle);
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
    
    // Check if projectile has hit water level
    if (currentPos.y <= this.waterLevel) {
      console.log('Projectile hit water!');
      this.destroy();
      return false;
    }
    
    // Check if projectile has hit terrain
    const terrainHeight = this.terrain.getHeightAt(currentPos.x, currentPos.z);
    if (currentPos.y <= terrainHeight) {
      console.log('Projectile hit terrain!');
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