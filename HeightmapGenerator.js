import { NoiseGenerator } from "./public/utils/NoiseGenerator.js";
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
      falloffScale: 0.9
    });

    const overlay = new NoiseGenerator();
    this.heightmapOverlay = overlay.generateHeightmap(this.mapSize, {
      scale: 0.01,
      octaves: 2,
      persistence: 0.5,
      lacunarity: 2,
      falloff: false,
      falloffStrength: 4,
      falloffScale: 0.9
    });
  }
}
