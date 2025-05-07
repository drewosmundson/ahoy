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
    
    // Boat properties
    this.boat = null;
    this.boatSpeed = 0.2;
    this.boatRotationSpeed = 0.03;
    this.boatMovement = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    
    // Initialize boat
    this.createBoat();
    
    // Add event listeners for keyboard controls
    this.initializeBoatControls();

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

  // Create a simple boat model
  createBoat() {
    // Create boat group to hold all boat parts
    this.boat = new THREE.Group();
    

    
    // Create boat cabin
    const cabinGeometry = new THREE.BoxGeometry(2, 1, 2);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D }); // Slightly different brown
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 1, -1); // Position on top of hull, slightly to the back
    this.boat.add(cabin);
    
    // Create boat mast
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 3, 0); // Position on top of hull
    this.boat.add(mast);
    
    // Create boat sail
    const sailGeometry = new THREE.PlaneGeometry(2, 3);

    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF, 
      side: THREE.DoubleSide 
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.rotation.y = Math.PI / 2; // Orient perpendicular to boat
    sail.position.set(0, 2, 0); // Position on mast
    this.boat.add(sail);
    
    // Position boat at center of map
    this.boat.position.set(40, 0, 40);
    
    // Add boat to scene
    this.scene.add(this.boat);
  }
  
  // Initialize boat controls
  initializeBoatControls() {
    // Add keydown event listener
    window.addEventListener('keydown', (event) => {
      switch(event.key) {
        case 'w':
        case 'ArrowUp':
          this.boatMovement.forward = true;
          break;
        case 's':
        case 'ArrowDown':
          this.boatMovement.backward = true;
          break;
        case 'a':
        case 'ArrowLeft':
          this.boatMovement.left = true;
          break;
        case 'd':
        case 'ArrowRight':
          this.boatMovement.right = true;
          break;
        case 'c': // Switch camera mode
          this.toggleCameraMode();
          break;
      }
    });
    
    // Add keyup event listener
    window.addEventListener('keyup', (event) => {
      switch(event.key) {
        case 'w':
        case 'ArrowUp':
          this.boatMovement.forward = false;
          break;
        case 's':
        case 'ArrowDown':
          this.boatMovement.backward = false;
          break;
        case 'a':
        case 'ArrowLeft':
          this.boatMovement.left = false;
          break;
        case 'd':
        case 'ArrowRight':
          this.boatMovement.right = false;
          break;
      }
    });
  }
  
  // Toggle between free camera and boat-following camera
  toggleCameraMode() {
    if (this.cameraMode === 'free') {
      // Switch to boat-following mode
      this.cameraMode = 'follow';
      this.controls.enabled = false; // Disable orbit controls
      
      // Store current camera position for when we switch back
      this.freeCameraPosition = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone()
      };
      
    } else {
      // Switch to free camera mode
      this.cameraMode = 'free';
      this.controls.enabled = true; // Enable orbit controls
      
      // Restore previous free camera position if it exists
      if (this.freeCameraPosition) {
        this.camera.position.copy(this.freeCameraPosition.position);
        this.controls.target.copy(this.freeCameraPosition.target);
        this.controls.update();
      }
    }
  }
  
  // Get terrain height at a specific world position
  getTerrainHeightAt(x, z) {
    // Convert world coordinates to heightmap indices
    const mapSize = this.mapSize;
    const terrainSize = 100; // Size of terrain in world units
    
    // Calculate normalized position in the terrain (0 to 1)
    const normalizedX = (x + terrainSize/2) / terrainSize;
    const normalizedZ = (z + terrainSize/2) / terrainSize;
    
    // Convert to heightmap indices
    const heightmapX = Math.floor(normalizedX * (mapSize - 1));
    const heightmapZ = Math.floor(normalizedZ * (mapSize - 1));
    
    // Check if position is within heightmap bounds
    if (heightmapX >= 0 && heightmapX < mapSize && 
        heightmapZ >= 0 && heightmapZ < mapSize) {
      // Return height from heightmap scaled to world units
      return this.heightmap[heightmapZ][heightmapX] * 15;
    }
    
    // Return default height (water level) if outside bounds
    return 0;
  }

  // Update boat position based on inputs
  updateBoat() {
    if (!this.boat) return;
    
    // Get current boat position and rotation
    const boatPosition = this.boat.position;
    const boatRotation = this.boat.rotation.y;
    
    // Calculate movement based on boat's rotation
    let deltaX = 0;
    let deltaZ = 0;
    
    // Forward/backward movement
    if (this.boatMovement.forward) {
      deltaX += Math.sin(boatRotation) * this.boatSpeed;
      deltaZ += Math.cos(boatRotation) * this.boatSpeed;
    }
    if (this.boatMovement.backward) {
      deltaX -= Math.sin(boatRotation) * this.boatSpeed * 0.5; // Slower reverse
      deltaZ -= Math.cos(boatRotation) * this.boatSpeed * 0.5;
    }
    
    // Rotation
    if (this.boatMovement.left) {
      this.boat.rotation.y += this.boatRotationSpeed;
    }
    if (this.boatMovement.right) {
      this.boat.rotation.y -= this.boatRotationSpeed;
    }
    
    // Calculate new position
    const newX = boatPosition.x + deltaX;
    const newZ = boatPosition.z + deltaZ;
    
    // Check if new position is within map bounds
    const mapBounds = 51; // Slightly less than map size (50) to prevent going off edge
    if (Math.abs(newX) < mapBounds && Math.abs(newZ) < mapBounds) {
      // Get terrain height at new position
      const terrainHeight = this.getTerrainHeightAt(newX, newZ);
      
      // Only move if the boat would be over water (terrain height < water level)
      // Set collision threshold lower than water level to create buoyancy effect
      if (terrainHeight < this.waterLevel + 0.5) { // Larger buffer to allow shallow water navigation
        boatPosition.x = newX;
        boatPosition.z = newZ;
        
        // Adjust boat height based on water waves
        const time = performance.now();
        const waveHeight = 0.5;
        const waveFrequency = 0.07;
        const noiseValue = this.waterNoise.noise(
          newX * waveFrequency + time * 0.00015,
          newZ * waveFrequency + time * 0.00012
        );
        
        // Set boat Y position to follow waves - slightly lower to show buoyancy
        this.boat.position.y = this.waterLevel - 0.8 + noiseValue * waveHeight;
        
        // Apply slight tilt based on waves
        this.boat.rotation.x = noiseValue * 0.1;
        this.boat.rotation.z = noiseValue * 0.1;
      }
    }
    
    // Update camera if in follow mode
    if (this.cameraMode === 'follow' && this.boat) {
      // Calculate camera position behind the boat
      const cameraDistance = 10;
      const cameraHeight = 5;
      const cameraX = boatPosition.x - Math.sin(boatRotation) * cameraDistance;
      const cameraZ = boatPosition.z - Math.cos(boatRotation) * cameraDistance;
      
      // Set camera position and look at boat
      this.camera.position.set(cameraX, this.waterLevel + cameraHeight, cameraZ);
      this.camera.lookAt(boatPosition);
    }
  }

  /**
   * Animation loop method to be called every frame
   * @param {number} time - Current time in milliseconds (automatically passed by requestAnimationFrame)
   */
  animate = (time) => {
    // If controls (like OrbitControls) are defined and enabled, update them each frame
    if (this.controls && this.controls.enabled) {
      this.controls.update();
    }
    
    // Update boat position and rotation
    this.updateBoat();
    
    // Update water waves animation
    if (this.water && this.waterVertices) {
      this.updateWaterWaves(time);
    }

    // Render the current scene using the camera's perspective
    this.renderer.render(this.scene, this.camera);
  };

  // Starts the animation loop using the renderer's built-in function
  start() {
    // Set initial camera mode
    this.cameraMode = 'free';
    this.renderer.setAnimationLoop(this.animate); // starts calling `animate()` repeatedly
  }

  // Update water waves animation
  updateWaterWaves(time) {
    const positions = this.water.geometry.attributes.position.array;
    const waterSize = this.waterMapSize;
    
    // Animation speed and wave parameters
    const timeScale = 0.00015;
    const waveHeight = 0.5;
    const waveFrequency = 0.07;
    
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