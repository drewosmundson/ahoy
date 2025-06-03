// Terrain.js - Handles terrain generation and rendering
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { NoiseGenerator } from '../utils/NoiseGenerator.js';

export class Terrain {
  constructor(scene, socket, host, terrainData) {
    this.scene = scene;
    this.mapSize = 512;
    this.lowPoly = true;
    this.terrainSize = 512;
    this.heightMultiply = 90;
    this.socket = socket;
    this.host = host;

    if (this.host) {
      this.generateTerrain();
      this.mesh = this.createTerrainMesh();
      this.socket.emit("terrainGenerated", {
        terrainData: {
          heightMap: this.heightmap,
          heightMapOverlay: this.heightMapOverlay
        }
      });
    } else {
      this.heightmap = terrainData.heightMap;
      this.heightMapOverlay = terrainData.heightMapOverlay;
      this.mesh = this.createTerrainMesh();
    }

    this.scene.add(this.mesh);
  }

  generateTerrain() {
    const noise = new NoiseGenerator();
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
      falloff: false,
      falloffStrength: 4,
      falloffScale: 0.9
    });
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
        const overlay = this.heightMapOverlay[y][x];
        const finalHeight = baseHeight * overlay * this.heightMultiply + (this.lowPoly ? 0.8 : 0);
        vertices[i + 1] = finalHeight;
      }
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x3d8c40,
      flatShading: this.lowPoly,
      wireframe: false
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
      const overlay = this.heightMapOverlay[heightmapZ][heightmapX];
      return height * overlay * this.heightMultiply;
    }

    return 0;
  }
}
