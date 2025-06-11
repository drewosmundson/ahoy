// NoiseGenerator.js - Utility for generating noise-based heightmaps with mountain barrier
import { SimplexNoise } from "./SimplexNoise.js"

export class NoiseGenerator {
  constructor() {
    this.simplex = new SimplexNoise();
  }

  /**
   * Generate a heightmap using SimplexNoise
   * @param {number} size - Size of the heightmap (size x size)
   * @param {Object} options - Generation options
   * @returns {Array<Array<number>>} 2D array of height values (0-1)
   */
  generateHeightmap(size, options = {}) {
    // Default options
    const defaults = {
      scale: 0.02,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
      falloff: true,
      falloffStrength: 3,
      falloffScale: 0.8,
      inversefalloffStrength: 3,
      inversefalloffScale: 0.8,
      inverseFalloff: false,
      // Mountain barrier options
      mountainBarrier: true,
      barrierWidth: 0.15,        // Width of barrier as fraction of map size (0.15 = 15%)
      barrierHeight: 0.9,        // Height of barrier (0-1)
      barrierFalloff: 2.0,       // How sharply barrier falls off inward
      barrierNoise: true,        // Add noise to barrier for natural look
      barrierNoiseScale: 0.05    // Scale of noise applied to barrier
    };

    // Merge options with defaults
    const config = { ...defaults, ...options };

    // Create heightmap array
    const heightmap = Array(size).fill().map(() => Array(size).fill(0));

    // Generate falloff map if needed
    const falloffMap = config.falloff ? this.generateFalloffMap(size, config) : null;
    const inverseFalloffMap = config.inverseFalloff ? this.generateInverseFalloffMap(size, config) : null;
    
    // Generate mountain barrier map
    const barrierMap = config.mountainBarrier ? this.generateMountainBarrierMap(size, config) : null;

    // Generate noise values
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Start with slight negative bias to ensure some water areas
        let value = -0.7;
        let amplitude = 1;
        let frequency = 0.7;
        let maxValue = 0;

        // Add multiple octaves of noise
        for (let i = 0; i < config.octaves; i++) {
          const noiseValue = this.simplex.noise(
            x * config.scale * frequency, 
            y * config.scale * frequency
          );

          value += amplitude * noiseValue;
          maxValue += amplitude;

          // Update values for next octave
          amplitude *= config.persistence;
          frequency *= config.lacunarity;
        }

        // Normalize to [0,1] range
        value = (value / maxValue + 1) / 2;

        // Apply falloff if enabled
        if (falloffMap) {
          const falloffValue = falloffMap[y][x];
          value = Math.max(0, value - falloffValue);
        }
        if (inverseFalloffMap) {
          const inversefalloffValue = inverseFalloffMap[y][x];
          value = Math.max(0, value - inversefalloffValue);
        }

        // Apply mountain barrier - this should be done AFTER other modifications
        if (barrierMap) {
          const barrierValue = barrierMap[y][x];
          // Use max to ensure barrier always dominates in border areas
          value = Math.max(value, barrierValue);
        }

        // Store in heightmap
        heightmap[y][x] = value;
      }
    }

    return heightmap;
  }

  /**
   * Generate mountain barrier map for edges
   * @param {number} size - Size of the map
   * @param {Object} options - Generation options
   * @returns {Array<Array<number>>} 2D array of barrier values (0-1)
   */
  generateMountainBarrierMap(size, options = {}) {
    const barrierMap = Array(size).fill().map(() => Array(size).fill(0));

    const barrierWidth = options.barrierWidth || 0.15;
    const barrierHeight = options.barrierHeight || 0.9;
    const barrierFalloff = options.barrierFalloff || 2.0;
    const addNoise = options.barrierNoise !== false;
    const noiseScale = options.barrierNoiseScale || 0.05;

    // Calculate barrier width in pixels
    const borderPixels = Math.floor(size * barrierWidth);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Calculate distance from nearest edge
        const distFromLeft = x;
        const distFromRight = size - 1 - x;
        const distFromTop = y;
        const distFromBottom = size - 1 - y;
        
        // Find minimum distance to any edge
        const distFromEdge = Math.min(distFromLeft, distFromRight, distFromTop, distFromBottom);
        
        let barrierValue = 0;
        
        if (distFromEdge < borderPixels) {
          // Calculate barrier strength (1 at edge, 0 at inner boundary)
          const normalizedDist = distFromEdge / borderPixels; // 0 at edge, 1 at inner boundary
          
          // Apply falloff curve (higher values = sharper falloff)
          const falloffValue = Math.pow(1 - normalizedDist, barrierFalloff);
          
          barrierValue = barrierHeight * falloffValue;
          
          // Add noise to make barrier look more natural
          if (addNoise) {
            const noiseValue = this.simplex.noise(x * noiseScale, y * noiseScale);
            // Scale noise based on distance from edge (more noise at edge)
            const noiseStrength = (1 - normalizedDist) * 0.3;
            barrierValue += noiseValue * noiseStrength * barrierHeight;
          }
        }

        // Ensure value is in valid range
        barrierValue = Math.min(1, Math.max(0, barrierValue));
        barrierMap[y][x] = barrierValue;
      }
    }

    return barrierMap;
  }


  gernerateMountainScaleValues(size, options = {}) {
    const mountainScaleMap = Array(size).fill().map(() => Array(size).fill(1));
    return mountainScaleMap;
  }

  generateFalloffMap(size, options = {}) {
    const falloffMap = Array(size).fill().map(() => Array(size).fill(0));

    const falloffStrength = options.falloffStrength || 3;
    const falloffScale = options.falloffScale || 0.8;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / (size - 1) * 2 - 1; 
        const ny = y / (size - 1) * 2 - 1;

        let distanceFromCenter = Math.max(Math.abs(nx), Math.abs(ny));
        let value = Math.pow(distanceFromCenter, falloffStrength);
        value *= falloffScale;
        value = Math.min(1, Math.max(0, value));

        falloffMap[y][x] = value;
      }
    }

    return falloffMap;
  }

  generateInverseFalloffMap(size, options = {}) {
    const inverseFalloffMap = Array(size).fill().map(() => Array(size).fill(0));

    const inverseFalloffStrength = options.inversefalloffStrength || 3;
    const inverseFalloffScale = options.inversefalloffScale || 0.8;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / (size - 1) * 2 - 1; 
        const ny = y / (size - 1) * 2 - 1;

        let distanceFromCenter = Math.max(Math.abs(nx), Math.abs(ny));
        let value = Math.pow(distanceFromCenter, inverseFalloffStrength);
        value *= inverseFalloffScale;
        value = Math.min(2, Math.max(1, value));

        inverseFalloffMap[y][x] = 1 - value;
      }
    }

    return inverseFalloffMap;
  }

  generateWaveNoise(x, z, time, options = {}) {
    const defaults = {
      frequency: 0.07,
      timeScale: 0.00015,
      amplitude: 0.5
    };

    const config = { ...defaults, ...options };

    const noiseValue = this.simplex.noise(
      x * config.frequency + time * config.timeScale, 
      z * config.frequency + time * config.timeScale * 0.8
    );

    return noiseValue * config.amplitude;
  }

  generateCombinedNoise(x, y, options = {}) {
    const defaults = {
      scale: 0.01,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2
    };

    const config = { ...defaults, ...options };

    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      const noiseValue = this.simplex.noise(
        x * config.scale * frequency,
        y * config.scale * frequency
      );

      value += amplitude * noiseValue;
      maxValue += amplitude;

      amplitude *= config.persistence;
      frequency *= config.lacunarity;
    }

    return value / maxValue;
  }

  addTerrainFeatures(heightmap, options = {}) {
    const size = heightmap.length;
    const defaults = {
      featureCount: 5,
      minRadius: size * 0.05,
      maxRadius: size * 0.15,
      minHeight: 0.2,
      maxHeight: 0.8,
      blendFactor: 2
    };

    const config = { ...defaults, ...options };
    const result = heightmap.map(row => [...row]);

    for (let i = 0; i < config.featureCount; i++) {
      const centerX = Math.floor(Math.random() * size);
      const centerY = Math.floor(Math.random() * size);

      const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
      const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
      const isMountain = Math.random() > 0.3;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > radius) continue;

          const blend = Math.pow(1 - distance / radius, config.blendFactor);

          if (isMountain) {
            result[y][x] += height * blend;
          } else {
            result[y][x] = Math.max(0, result[y][x] - height * blend);
          }
        }
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        result[y][x] = Math.min(1, Math.max(0, result[y][x]));
      }
    }

    return result;
  }
}