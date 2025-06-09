// Boat.js - Handles boat creation and movement
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Projectile {
  constructor(scene, waterLevel, boatPositionX, boatPositionZ, boatRotation) {
    this.scene = scene; 
    this.waterLevel = waterLevel;
    this.terrainHeight = terrainHeight;
    this.socket = socket;
    // Movement properties
    this.speed = 5;
    this.angle = 5;
    
    this.gravity = 9.8

    // Create boat model
    this.model = this.createProjectileModel();
    
    // Set initial position
    this.model.position.set(boatPositionX, waterLevel, boatPositionZ);
    
    // Add to scene
    this.scene.add(this.model);
  }
  
  createProjectileModel() {
    // Create  group to hold all parts
    // Creates a group for future additions to model
    const projectile = new THREE.Group();
    projectile.position.set()
    // create projectile
    const sphere = new THREE.SphereGeometry( 1, 1, 1 )
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const sphereMesh = new THREE.Mesh(sphere, sphereMat);
    sphere.position.y = 0.5; // Half height above water
    projectile.add(sphereMesh);

    // Set Hit Box
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(projectile);
    projectile.add(boundingBox);

    return projectile;
  }
  
  setPositionAndRotation(x, y, z, rotation) {
    if (!this.model) return;
    
    // Set position
    this.model.position.set(x, y, z);
    
    // Set rotation
    this.model.rotation.y = rotation;
  }
  

  update(time, movement, terrain) {
    if (!this.model) return;
    
    // Get current position and rotation
    const position = this.model.position;
    const rotation = this.model.rotation.y;
    
    // Calculate movement vector based on boat's rotation
    let deltaX = 0;
    let deltaZ = 0;
    
    // Forward/backward movement
    if (movement.forward) {
      deltaX += Math.sin(rotation) * this.speed;
      deltaZ += Math.cos(rotation) * this.speed;
    }
    if (movement.backward) {
      deltaX -= Math.sin(rotation) * this.speed * 0.5; // Slower reverse
      deltaZ -= Math.cos(rotation) * this.speed * 0.5;
    }
    
    // Rotation
    if (movement.left) {
      this.model.rotation.y += this.rotationSpeed;
    }
    if (movement.right) {
      this.model.rotation.y -= this.rotationSpeed;
    }
    
    // Calculate new position
    const newX = position.x + deltaX;
    const newZ = position.z + deltaZ;

    // Check if new position is within map bounds
    const mapBounds = 450; // Slightly less than map size
    if (Math.abs(newX) < mapBounds && Math.abs(newZ) < mapBounds) {
      // Get terrain height at new position
      const terrainHeight = terrain.getHeightAt(newX, newZ);

      // Only move if boat would be over water
      if (terrainHeight < this.waterLevel) {
        position.x = newX;
        position.z = newZ;
        
        // Simulate buoyancy and waves
        const waveHeight = 0.5;
        const waveFrequency = 0.07;
        
        // Using sine functions for simple wave motion
        const timeScale = time * 0.001;
        const noiseX = Math.sin(timeScale + newX * waveFrequency) * 0.5;
        const noiseZ = Math.cos(timeScale + newZ * waveFrequency) * 0.5;
        const noiseValue = (noiseX + noiseZ) * 0.5;
        
        // Update boat position and rotation with wave effect
        this.model.position.y = this.waterLevel - 0.5 + noiseValue * waveHeight;
        this.model.rotation.x = noiseValue * 0.1;
        this.model.rotation.z = noiseValue * 0.1;
      }
    }
  }
}