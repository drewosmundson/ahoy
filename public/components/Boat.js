// Boat.js - Handles boat creation and movement
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Boat {
  constructor(scene, waterLevel) {
    this.scene = scene;
    this.waterLevel = waterLevel;
    
    // Movement properties
    this.speed = 0.2;
    this.rotationSpeed = 0.03;

    // Create boat model
    this.model = this.createBoatModel();
    
    // Set initial position
    this.model.position.set(40, waterLevel, 40);
    
    // Add to scene
    this.scene.add(this.model);
  }
  
  createBoatModel() {
    // Create boat group to hold all parts
    const boat = new THREE.Group();
    boat.position.set()
    // Create boat hull (base)
    const hullGeometry = new THREE.BoxGeometry(3, 1, 6);
    const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 0.5; // Half height above water
    boat.add(hull);
    
    // Create boat cabin
    const cabinGeometry = new THREE.BoxGeometry(2, 1, 2);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 1, -1); // Position on top of hull, slightly to back
    boat.add(cabin);
    
    // Create boat mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 3, 0); // Position on top of hull
    boat.add(mast);
    
    // Create boat sail
    const sailGeometry = new THREE.PlaneGeometry(2, 3);
    const sailMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.rotation.y = Math.PI / 1; // Orient perpendicular to boat
    sail.position.set(0, 2, 0); // Position on mast
    boat.add(sail);
    // Create boat hitbox
    


    return boat;
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