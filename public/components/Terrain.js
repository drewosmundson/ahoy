// Terrain.js - Handles terrain generation and rendering
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { NoiseGenerator } from '../utils/NoiseGenerator.js';

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.mapSize = 512;
    this.lowPoly = false;
    this.terrainSize = 512; // Size in world units
    this.heightMultiply = 90;
    
    // Generate terrain data
    this.generateTerrain();
    
    // Create and add terrain mesh to scene
    this.mesh = this.createTerrainMesh();
    this.scene.add(this.mesh);
  }
  
  generateTerrain() {
    // Create noise generator
    const noise = new NoiseGenerator();

    // Generate height map with falloff for island effect
    this.heightmap = noise.generateHeightmap(this.mapSize, {
      scale: 0.015,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
      falloff: true,
      falloffStrength: 4,
      falloffScale: 0.9
    });


    const overlay = new NoiseGenerator();
    this.heightMapOverlay = overlay.generateHeightmap(this.mapSize, {
      scale: 0.01,
      octaves: 2,
      persistence: 0.5,
      lacunarity: 2,
      falloff: false ,
      falloffStrength: 4,
      falloffScale: 0.9
    });




  }

  
  createTerrainMesh() {
    const size = this.mapSize;
    let geometry;
    
    if (this.lowPoly) {
      // Create low-poly terrain with fewer segments
      const segmentCount = Math.floor(size / 8);
      geometry = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, segmentCount, segmentCount);
      geometry.rotateX(-Math.PI / 2);
      
      // Apply heightmap to vertices with random variation
      const vertices = geometry.attributes.position.array;
      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const x = Math.floor((j % (segmentCount + 1)) * (size / segmentCount));
        const y = Math.floor(Math.floor(j / (segmentCount + 1)) * (size / segmentCount));
        
        if (x < size && y < size) {
          // Add random variation for jagged look
          const randomHeight = Math.random() * 0.8;
          vertices[i + 1] = this.heightmap[y < size ? y : size-1][x < size ? x : size-1] * this.heightMapOverlay[y][x] * this.heightMultiply + randomHeight;
        }
      }
    } else {
      // Create regular terrain with more detail
      geometry = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, size - 1, size - 1);
      geometry.rotateX(-Math.PI / 2);
      
      // Apply heightmap to vertices
      const vertices = geometry.attributes.position.array;
      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const x = Math.floor(j % size);
        const y = Math.floor(j / size);
        
        if (x < size && y < size) {
          vertices[i + 1] = this.heightmap[y][x] * this.heightMapOverlay[y][x] * this.heightMultiply;
        }
      }
    }
    
    // Update normals for proper lighting
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x3d8c40,
      flatShading: this.lowPoly,
      wireframe: false
    });
    
    // Create and return mesh
    return new THREE.Mesh(geometry, material);
  }
  
  // Toggle between low-poly and regular terrain
  toggleTerrainMode() {
    this.lowPoly = !this.lowPoly;
    
    // Remove current terrain mesh
    this.scene.remove(this.mesh);
    
    // Create new terrain mesh with updated mode
    this.mesh = this.createTerrainMesh();
    
    // Add new mesh to scene
    this.scene.add(this.mesh);
    
    return this.lowPoly ? 'Low Poly' : 'Regular';
  }
  
  // Get height at specific world coordinates
  getHeightAt(x, z) {
    // Convert world coordinates to heightmap indices
    const normalizedX = (x + this.terrainSize / 2) / this.terrainSize;
    const normalizedZ = (z + this.terrainSize / 2) / this.terrainSize;

    // Convert to heightmap indices
    const heightmapX = Math.floor(normalizedX * (this.mapSize - 1));
    const heightmapZ = Math.floor(normalizedZ * (this.mapSize - 1));

    // Check if position is within heightmap bounds
    if (
      heightmapX >= 0 && heightmapX < this.mapSize &&
      heightmapZ >= 0 && heightmapZ < this.mapSize
    ) {
      // Combine heightmap, overlay, and height multiplier
      const height = this.heightmap[heightmapZ][heightmapX];
      const overlay = this.heightMapOverlay[heightmapZ][heightmapX];
      return height * overlay * this.heightMultiply;
    }

    // Return default height if outside bounds
    return 0;
  }

}