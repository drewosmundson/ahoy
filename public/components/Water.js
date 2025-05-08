// Water.js - Handles water plane with animated waves
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { SimplexNoise } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/math/SimplexNoise.js';

export class Water {
  constructor(scene, waterLevel = 8) {
    this.scene = scene;
    this.waterLevel = waterLevel;
    this.waterSize = 64; // Resolution of water mesh
    
    // Initialize noise generator for waves
    this.noise = new SimplexNoise();
    
    // Create water mesh
    this.mesh = this.createWaterMesh();
    this.scene.add(this.mesh);
  }
  
  createWaterMesh() {
    // Create water plane geometry
    const geometry = new THREE.PlaneGeometry(
      500, // Same size as terrain
      500,
      this.waterSize - 1,
      this.waterSize - 1
    );
    
    // Make horizontal and position at water level
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, this.waterLevel, 0);
    
    // Store original vertices for wave animation
    this.originalVertices = geometry.attributes.position.array.slice();
    
    // Create semi-transparent blue material
    const material = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      transparent: true,
      opacity: 0.8,
      metalness: 0.1,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    
    return new THREE.Mesh(geometry, material);
  }
  
  update(time) {
    if (!this.mesh || !this.originalVertices) return;
    
    const positions = this.mesh.geometry.attributes.position.array;
    
    // Animation parameters
    const timeScale = 0.0002;
    const waveHeight = 0.8;
    const waveFrequency = 0.08;
    
    // Update each vertex position for wave effect
    for (let i = 0; i < positions.length; i += 3) {
      const originalX = this.originalVertices[i];
      const originalZ = this.originalVertices[i + 2];
      
      // Calculate wave height using noise
      const noiseValue = this.noise.noise(
        originalX * waveFrequency + time * timeScale,
        originalZ * waveFrequency + time * timeScale * 0.8
      );
      
      // Apply height (Y coordinate is at index i+1)
      positions[i + 1] = this.waterLevel + noiseValue * waveHeight;
    }
    
    // Mark geometry for update
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
  
  // Get water height at specific coordinates including waves
  getWaveHeightAt(x, z, time) {
    const waveFrequency = 0.07;
    const waveHeight = 0.5;
    
    // Calculate wave height using noise
    const noiseValue = this.noise.noise(
      x * waveFrequency + time * 0.00015,
      z * waveFrequency + time * 0.00012
    );
    
    return this.waterLevel + noiseValue * waveHeight;
  }
}