// Import the entire Three.js library
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';


// Define and export the Game class
export class Game {
  
  // Constructor takes in an HTML canvas element where the scene will be rendered
  constructor(canvas) {

    // Set the map size (can be used for positioning or scaling elements later)
    this.mapSize = 256;
    
    // Store the canvas reference for rendering
    this.canvas = canvas;

    // Create a new Three.js scene where all objects will be added
    this.scene = new THREE.Scene();

    // Call initialization methods to set up the renderer, camera, and lighting
    this.initializeRenderer();
    this.initializeCamera();
    this.initializeLighting();

    // Attach an event listener to handle resizing the window
    window.addEventListener('resize', this.handleWindowResize);

    // Immediately call the resize handler to set the correct initial canvas size
    this.handleWindowResize();
    
    this.renderer.setAnimationLoop(this.animate); // starts calling `animate()` repeatedly
  }

  // Initializes the WebGL renderer for drawing 3D scenes
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

  /**
   * Animation loop method to be called every frame
   * @param {number} time - Current time in milliseconds (automatically passed by requestAnimationFrame)
   */
  animate = (time) => {
    // If controls (like OrbitControls) are defined, update them each frame
    if (this.controls) {
      this.controls.update();
    }

    // Render the current scene using the camera's perspective
    this.renderer.render(this.scene, this.camera);
  };

  // Starts the animation loop using the renderer's built-in function
  start() {
    this.renderer.setAnimationLoop(this.animate); // starts calling `animate()` repeatedly
  }

  // Stops the animation loop by passing null
  stop() {
    this.renderer.setAnimationLoop(null); // stops rendering
  }
}
