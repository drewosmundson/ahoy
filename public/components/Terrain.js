// Terrain.js - Handles terrain generation and rendering
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { NoiseGenerator } from '../utils/NoiseGenerator.js';

export class Terrain {
  constructor(scene, socket, multiplayer, heightmap, heightmapOverlay) {
    this.scene = scene;
    this.mapSize = 512; // 512
    this.lowPoly = true;
    this.terrainSize = 512;
    this.heightMultiply = 90;
    this.socket = socket;

    this.multiplayer = multiplayer;

    if (this.multiplayer) {
      this.heightmap = heightmap;
      this.heightmapOverlay = heightmapOverlay;
    } else {
      this.generateTerrain();
    }
    this.mesh = this.createTerrainMesh();
    this.scene.add(this.mesh);
    this.underMesh = this.createUnderMesh();
    this.scene.add(this.underMesh);
  }

generateTerrain() {
  const noise = new NoiseGenerator();
  // Generate base terrain with mountain ring
  this.heightmap = noise.generateHeightmap(this.mapSize, {
    scale: 0.015,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    falloff: true,           // Keep island falloff for center
    falloffStrength: 4,
    falloffScale: 0.9,
    inversefalloffStrength: 3,
    inversefalloffScale: 0.8,
    inverseFalloff: false,

    mountainBarrier: true,
    barrierWidth: 0.2,        // Width of barrier as fraction of map size (0.15 = 15%)
    barrierHeight: 0.4,        // Height of barrier (0-1)
    barrierFalloff: 1,       // How sharply barrier falls off inward
    barrierNoise: true,        // Add noise to barrier for natural look
    barrierNoiseScale: 0.04    // Scale of noise applied to barrier
  });

  const overlay = new NoiseGenerator();
  this.heightmapOverlay = overlay.generateHeightmap(this.mapSize, {
    scale: 0.01,
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2,
    falloff: false,
    falloffStrength: 5,
    falloffScale: 0.9,
    inversefalloffStrength: 12,
    inversefalloffScale: 10,
    inverseFalloff: false,

    mountainBarrier: true,
    barrierWidth: 0.4,        // Width of barrier as fraction of map size (0.15 = 15%)
    barrierHeight: 0.8,        // Height of barrier (0-1)
    barrierFalloff: 2.0,       // How sharply barrier falls off inward
    barrierNoise: true,        // Add noise to barrier for natural look
    barrierNoiseScale: 0.04    // Scale of noise applied to barrier
  });
}

  createUnderMesh() {
    const size = this.mapSize ;
    const segmentCount = this.lowPoly ? Math.floor(size / 4) : size - 1;
    const geometry = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, segmentCount, segmentCount);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x3d8c40,
    });

    return new THREE.Mesh(geometry, material);
  }

  createTerrainMesh() {
    const size = this.mapSize;
    const segmentCount = this.lowPoly ? Math.floor(size / 4) : size - 1;
    const geometry = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, segmentCount, segmentCount);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;

    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
      const x = this.lowPoly
        ? Math.floor((j % (segmentCount + 1)) * (size / segmentCount))
        : Math.floor(j % size);
      const y = this.lowPoly
        ? Math.floor(Math.floor(j / (segmentCount + 1)) * (size / segmentCount))
        : Math.floor(j / size);
      

      if (x < size && y < size) {
        const baseHeight = this.heightmap[y][x];
        const overlay = this.heightmapOverlay[y][x];
        const finalHeight = baseHeight * overlay  * this.heightMultiply + (this.lowPoly ? 0.8 : 0);
        vertices[i + 1] = finalHeight ;
        

      }
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x3d8c40,
      flatShading: this.lowPoly,
      wireframe: false,

    });

    return new THREE.Mesh(geometry, material);
  }

  toggleTerrainMode() {
    this.lowPoly = !this.lowPoly;
    this.scene.remove(this.mesh);
    this.mesh = this.createTerrainMesh();
    this.scene.add(this.mesh);
    return this.lowPoly ? 'Low Poly' : 'Regular';
  }

  getHeightAt(x, z) {
    const normalizedX = (x + this.terrainSize / 2) / this.terrainSize;
    const normalizedZ = (z + this.terrainSize / 2) / this.terrainSize;

    const heightmapX = Math.floor(normalizedX * (this.mapSize - 1));
    const heightmapZ = Math.floor(normalizedZ * (this.mapSize - 1));

    if (
      heightmapX >= 0 && heightmapX < this.mapSize &&
      heightmapZ >= 0 && heightmapZ < this.mapSize
    ) {
      const height = this.heightmap[heightmapZ][heightmapX];
      const overlay = this.heightmapOverlay[heightmapZ][heightmapX];
      return height * overlay * this.heightMultiply;
    }

    return 0;
  }
}
