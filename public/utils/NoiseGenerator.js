// NoiseGenerator.js - Utility for generating noise-based heightmaps with seeded random generation

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  
  next() {
    this.seed = this.seed * 16807 % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

/**
 * Seeded SimplexNoise implementation
 */
class SeededSimplexNoise {
  constructor(seed) {
    this.rng = new SeededRandom(seed);
    this.perm = new Array(256);
    this.permMod12 = new Array(256);
    
    // Initialize permutation table with seeded randomness
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // Shuffle using seeded random
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Duplicate the permutation vector
    for (let i = 0; i < 256; i++) {
      this.perm[i] = p[i];
      this.permMod12[i] = this.perm[i] % 12;
    }
    
    // Gradients for 2D noise
    this.grad2 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [1, 0], [-1, 0],
      [0, 1], [0, -1], [0, 1], [0, -1]
    ];
  }
  
  noise(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    
    let n0, n1, n2;
    
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (this.grad2[gi0][0] * x0 + this.grad2[gi0][1] * y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (this.grad2[gi1][0] * x1 + this.grad2[gi1][1] * y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (this.grad2[gi2][0] * x2 + this.grad2[gi2][1] * y2);
    }
    
    return 70.0 * (n0 + n1 + n2);
  }
}

export class NoiseGenerator {
  constructor(seed) {
    this.seed = seed;
    this.simplex = new SeededSimplexNoise(seed);
    this.rng = new SeededRandom(seed + 1); // Offset seed for other random operations
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
    
    // Add random features using seeded random
    for (let i = 0; i < config.featureCount; i++) {
      // Seeded random feature position
      const centerX = Math.floor(this.rng.next() * size);
      const centerY = Math.floor(this.rng.next() * size);
      
      // Seeded random feature properties
      const radius = config.minRadius + this.rng.next() * (config.maxRadius - config.minRadius);
      const height = config.minHeight + this.rng.next() * (config.maxHeight - config.minHeight);
      const isMountain = this.rng.next() > 0.3; // 70% chance of mountain, 30% valley
      
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
  
  /**
   * Get the current seed value
   * @returns {number} Current seed
   */
  getSeed() {
    return this.seed;
  }
  
  /**
   * Set a new seed and reinitialize generators
   * @param {number} newSeed - New seed value
   */
  setSeed(newSeed) {
    this.seed = newSeed;
    this.simplex = new SeededSimplexNoise(newSeed);
    this.rng = new SeededRandom(newSeed + 1);
  }
}