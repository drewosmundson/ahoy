import { NoiseGenerator } from "../public/utils/NoiseGenerator.js";
// the intnedtion of this class is that all charectors get the same heightmap
export class HeightmapGenerator {
  constructor(){
    this.mapSize = 512;
    this.heightmapOverlay = null;
    this.heightmap = null; 
    this.generateTerrain();
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
      falloffScale: 0.9,

      barrierWidth: 0.1,        // Width of barrier as fraction of map size (0.15 = 15%)
      barrierHeight: 0.6,        // Height of barrier (0-1)
      barrierFalloff: 0.5,       // How sharply barrier falls off inward
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
      falloffStrength: 4,
      falloffScale: 0.9,

      mountainBarrier: true,
      barrierWidth: 0.4,        // Width of barrier as fraction of map size (0.15 = 15%)
      barrierHeight: 0.9,        // Height of barrier (0-1)
      barrierFalloff: 2.0,       // How sharply barrier falls off inward
      barrierNoise: true,        // Add noise to barrier for natural look
      barrierNoiseScale: 0.04    // Scale of noise applied to barrier
    });
  }
}
