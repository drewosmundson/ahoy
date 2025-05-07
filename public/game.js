// Import the entire Three.js library
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js';
// Import SimplexNoise for terrain generation
import { SimplexNoise } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/math/SimplexNoise.js';

// Define and export the Game class
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.mapSize = 256; // Default map size for terrain
    this.waterMapSize = 64; // Size for water geometry (less detail needed)
    this.waterLevel = 5; // Default water level height
    
    // Call initialization methods to set up the renderer, camera
    this.initializeRenderer();
    this.initializeCamera();
    // Create a new Three.js scene where all objects will be added
    this.scene = new THREE.Scene();
    this.initializeLighting();
    this.initializeControls();

    // Setup the scene
    this.setupScene();

    // Initialize simplex noise for water waves
    this.waterNoise = new SimplexNoise();

    // Attach an event listener to handle resizing the window
    window.addEventListener('resize', this.handleWindowResize);
    // Immediately call the resize handler to set the correct initial canvas size
    this.handleWindowResize();
  }

  ///////////////////////////////////////////////////
  // set up renderer and camera on HTML canvas element
  ///////////////////////////////////////////////////
  // Initializes the WebGL renderer
  initializeRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, // Render directly to the provided canvas
      antialias: true      // Enable anti-aliasing for smoother edges
    });
    // Set pixel ratio to match the display (e.g. Retina screens)
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  // Initializes the camera with perspective projection
  initializeCamera() {
    // Calculate the aspect ratio from canvas size
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    // Create a perspective camera: (FOV, aspect, near, far)
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    // Set the camera position in 3D space (x, y, z)
    this.camera.position.set(0, 30, 50);
    // Make the camera look at the center of the scene
    this.camera.lookAt(0, 0, 0);
  }

  // Sets up lighting in the scene
  initializeLighting() {
    // Create a directional light that simulates sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // white light, full intensity
    directionalLight.position.set(50, 50, 50); // position it high and to the side
    this.scene.add(directionalLight); // add light to the scene

    // Create ambient light to provide global illumination without direction
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // white light, lower intensity
    this.scene.add(ambientLight); // add ambient light to scene
  }

  // Initialize orbit controls
  initializeControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.5;
    this.controls.update();
  }

  // Setup the scene with terrain and other objects
  setupScene() {
    // Add a grid helper for reference
    const gridHelper = new THREE.GridHelper(100, 10);
    this.scene.add(gridHelper);
    
    // Generate perlin noise for the terrain
    this.generatePerlinNoise();
    
    // Create and add terrain to the scene
    this.terrain = this.createTerrain();
    this.scene.add(this.terrain);
    
    // Add water plane with waves
    this.water = this.createWater();
    this.scene.add(this.water);
  }

  // Generate perlin noise heightmap
  // Generate perlin noise heightmap
  generatePerlinNoise() {
    // Use SimplexNoise for terrain generation
    const simplex = new SimplexNoise();
    const size = this.mapSize;
    const scale = 0.02; // Adjust for more/less variation
    this.heightmap = [];
    
    // Generate falloff map for island effect
    this.generateFalloffMap(size);
    
    for (let y = 0; y < size; y++) {
      this.heightmap[y] = [];
      for (let x = 0; x < size; x++) {
        // Get noise value with multiple octaves for more natural terrain
        let value = 0;
        let amplitude = 1.0;
        let frequency = 1;
        let maxValue = 0;
        
        // Add multiple octaves of noise
        for (let i = 0; i < 4; i++) {
          value += amplitude * simplex.noise(x * scale * frequency, y * scale * frequency);
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        // Normalize to range [0, 1]
        value = (value / maxValue + 1) / 2;
        
        // Apply falloff map to create island effect
        const falloffValue = this.falloffMap[y][x];
        value = Math.max(0, value - falloffValue);
        
        this.heightmap[y][x] = value;
      }
    }
  }
  
  generateFalloffMap(size) {
    this.falloffMap = [];
    
    for (let y = 0; y < size; y++) {
      this.falloffMap[y] = [];
      for (let x = 0; x < size; x++) {
        // Calculate normalized position from center (range -1 to 1)
        const nx = x / (size - 1) * 2 - 1; 
        const ny = y / (size - 1) * 2 - 1;
        
        // Calculate distance from center (0,0)
        let distanceFromCenter = Math.max(Math.abs(nx), Math.abs(ny));
        
        // Apply curve to create sharper falloff near edges
        const falloffStrength = 3; // Higher values create steeper falloff
        let value = Math.pow(distanceFromCenter, falloffStrength);
        
        // Scale falloff effect (0 = no effect, 1 = full effect)
        const falloffScale = 0.7; // Adjust to control island size
        value *= falloffScale;
        
        // Ensure value is in range [0,1]
        value = Math.min(1, Math.max(0, value));
        
        this.falloffMap[y][x] = value;
      }
    }
  }
  // Create terrain from heightmap
  createTerrain() {
    const size = this.mapSize;
    const geometry = new THREE.PlaneGeometry(100, 100, size - 1, size - 1);
    geometry.rotateX(-Math.PI / 2); // Make horizontal
    
    // Apply heightmap to vertices
    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
      const x = Math.floor(j % size);
      const y = Math.floor(j / size);
      
      if (x < size && y < size) {
        vertices[i + 1] = this.heightmap[y][x] * 15; // Y-axis is up, scale height by 15
      }
    }
    
    // Update normals for proper lighting
    geometry.computeVertexNormals();
    
    // Create materials for the terrain
    const material = new THREE.MeshStandardMaterial({
      color: 0x3d8c40,
      flatShading: false,
      wireframe: false,
      vertexColors: false
    });
    
    // Create terrain mesh and return it
    return new THREE.Mesh(geometry, material);
  }
  // Create water with animated waves
  createWater() {
    // Create a plane geometry for the water
    const geometry = new THREE.PlaneGeometry(
      100, // Slightly larger than terrain (100) to ensure coverage
      100, 
      this.waterMapSize - 1, 
      this.waterMapSize - 1
    );
    geometry.rotateX(-Math.PI / 2); // Make horizontal
    
    // Store original vertices positions for animation
    this.waterVertices = geometry.attributes.position.array.slice();
    
    // Create a semi-transparent blue material for water
    const material = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      transparent: true,
      opacity: 0.8,
      metalness: 0.1,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    
    // Raise water to desired level
    geometry.translate(0, this.waterLevel, 0);
    
    // Create and return water mesh
    return new THREE.Mesh(geometry, material);
  }



  /**
   * Animation loop method to be called every frame
   * @param {number} time - Current time in milliseconds (automatically passed by requestAnimationFrame)
   */
  animate = (time) => {
    // If controls (like OrbitControls) are defined, update them each frame
    if (this.controls) {
      this.controls.update();
    }
    // Update water waves animation
    if (this.water && this.waterVertices) {
      this.updateWaterWaves(time);
    }

    // Render the current scene using the camera's perspective
    this.renderer.render(this.scene, this.camera);
  };

  // Starts the animation loop using the renderer's built-in function
  start() {
    this.renderer.setAnimationLoop(this.animate); // starts calling `animate()` repeatedly
  }




  
  // Update water waves animation
  updateWaterWaves(time) {
    const positions = this.water.geometry.attributes.position.array;
    const waterSize = this.waterMapSize;
    
    // Animation speed and wave parameters
    const timeScale = 0.0005;
    const waveHeight = 0.5;
    const waveFrequency = 0.05;
    
    // Animate each vertex
    for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
      const originalX = this.waterVertices[i];
      const originalZ = this.waterVertices[i + 2];
      
      // Calculate wave height using perlin noise that moves over time
      const noiseValue = this.waterNoise.noise(
        originalX * waveFrequency + time * timeScale, 
        originalZ * waveFrequency + time * timeScale * 0.8
      );
      
      // Apply wave height (Y-coordinate is index+1)
      positions[i + 1] = this.waterLevel + noiseValue * waveHeight;
    }
    
    // Update geometry
    this.water.geometry.attributes.position.needsUpdate = true;
    this.water.geometry.computeVertexNormals();
  }



  // Stops the animation loop by passing null
  stop() {
    this.renderer.setAnimationLoop(null); // stops rendering
  }





  // Handles resizing the window and maintaining a 16:9 aspect ratio
  handleWindowResize = () => {
    // Get the current window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate a width and height that fits within the window while preserving 16:9
    let width = windowWidth;
    let height = (width * 9) / 16;
    
    // If height exceeds window, adjust width instead
    if (height > windowHeight) {
      height = windowHeight;
      width = (height * 16) / 9;
    }
    
    // Apply calculated size to the canvas using CSS
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Resize the actual renderer to match canvas dimensions
    this.renderer.setSize(width, height, false);

    // Update the camera's aspect ratio and projection matrix
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

}