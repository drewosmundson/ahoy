
// NoiseGenerator.js - Utility for generating noise-based heightmaps
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
      falloffScale: 0.8
    };

    // Merge options with defaults
    const config = { ...defaults, ...options };

    // Create heightmap array
    const heightmap = Array(size).fill().map(() => Array(size).fill(0));

    // Generate falloff map if needed
    const falloffMap = config.falloff ? this.generateFalloffMap(size, config) : null;

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

        // Store in heightmap
        heightmap[y][x] = value;
      }
    }

    return heightmap;
  }

  /**
   * Generate a falloff map to create island effect
   * @param {number} size - Size of the map
   * @param {Object} options - Generation options
   * @returns {Array<Array<number>>} 2D array of falloff values (0-1)
   */
  generateFalloffMap(size, options = {}) {
    const falloffMap = Array(size).fill().map(() => Array(size).fill(0));

    // Extract options
    const falloffStrength = options.falloffStrength || 3;
    const falloffScale = options.falloffScale || 0.8;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Calculate normalized position from center (range -1 to 1)
        const nx = x / (size - 1) * 2 - 1; 
        const ny = y / (size - 1) * 2 - 1;

        // Calculate distance from center (0,0)
        let distanceFromCenter = Math.max(Math.abs(nx), Math.abs(ny));

        // Apply curve to create sharper falloff near edges
        let value = Math.pow(distanceFromCenter, falloffStrength);

        // Scale falloff effect (0 = no effect, 1 = full effect)
        value *= falloffScale;

        // Ensure value is in range [0,1]
        value = Math.min(1, Math.max(0, value));

        falloffMap[y][x] = value;
      }
    }

    return falloffMap;
  }

  /**
   * Generate noise for water waves
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {number} time - Current time for animation
   * @param {Object} options - Wave options
   * @returns {number} Wave height value
   */
  generateWaveNoise(x, z, time, options = {}) {
    const defaults = {
      frequency: 0.07,
      timeScale: 0.00015,
      amplitude: 0.5
    };

    const config = { ...defaults, ...options };

    // Calculate wave height using perlin noise that moves over time
    const noiseValue = this.simplex.noise(
      x * config.frequency + time * config.timeScale, 
      z * config.frequency + time * config.timeScale * 0.8
    );

    return noiseValue * config.amplitude;
  }

  /**
   * Generate a combined noise value with multiple layers
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} options - Generation options
   * @returns {number} Combined noise value
   */
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

    // Combine multiple octaves of noise
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

    // Normalize to [-1,1] range
    return value / maxValue;
  }

  /**
   * Generate random terrain features such as mountains or valleys
   * @param {Array<Array<number>>} heightmap - Base heightmap to modify
   * @param {Object} options - Feature options
   * @returns {Array<Array<number>>} Modified heightmap
   */
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

    // Create a copy of the heightmap
    const result = heightmap.map(row => [...row]);

    // Add random features
    for (let i = 0; i < config.featureCount; i++) {
      // Random feature position
      const centerX = Math.floor(Math.random() * size);
      const centerY = Math.floor(Math.random() * size);

      // Random feature properties
      const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
      const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
      const isMountain = Math.random() > 0.3; // 70% chance of mountain, 30% valley

      // Apply feature to heightmap
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // Calculate distance from feature center
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Skip if outside radius
          if (distance > radius) continue;

          // Calculate blend factor (1 at center, 0 at edge)
          const blend = Math.pow(1 - distance / radius, config.blendFactor);

          // Apply height change
          if (isMountain) {
            // Add height for mountains
            result[y][x] += height * blend;
          } else {
            // Subtract height for valleys (but keep above 0)
            result[y][x] = Math.max(0, result[y][x] - height * blend);
          }
        }
      }
    }

    // Ensure values are in range [0,1]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        result[y][x] = Math.min(1, Math.max(0, result[y][x]));
      }
    }

    return result;
  }
}

















