// Game.js - Core game class
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js';
import { Terrain } from './components/Terrain.js';
import { Water } from './components/Water.js';
import { Boat } from './components/Boat.js';
import { Skybox } from './components/Skybox.js';
import { InputController } from './utils/InputController.js';

export class Game {
  constructor(canvas) {
    // Core properties
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.cameraMode = 'free';
    this.waterLevel = 10;
    
    // Initialize core systems
    this.initRenderer();
    this.initCamera();
    this.initLighting();
    this.initControls();
    
    // Create game components
    this.terrain = new Terrain(this.scene);
    
    this.water = new Water(this.scene, this.waterLevel);
    this.boat = new Boat(this.scene, this.waterLevel);
    this.skybox = new Skybox(this.scene);
    this.input = new InputController(this);
    
    // Add helpers
    this.addHelpers();

    window.addEventListener('resize', this.handleWindowResize);
    this.handleWindowResize();
  }
  
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }
  
  initCamera() {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 50);
    this.camera.lookAt(0, 0, 0);
  }
  
  initLighting() {
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xFFF5EE, 1);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);
    
    // Ambient light for global illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.5;
    this.controls.update();
  }
  
  addHelpers() {
    const gridHelper = new THREE.GridHelper(200, 10);
    this.scene.add(gridHelper);
  }
  
  toggleCameraMode() {
    if (this.cameraMode === 'free') {
      // Switch to boat-follow mode
      this.cameraMode = 'follow';
      this.controls.enabled = false;
      this.freeCameraPosition = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone()
      };
    } else {
      // Switch back to free mode
      this.cameraMode = 'free';
      this.controls.enabled = true;
      
      if (this.freeCameraPosition) {
        this.camera.position.copy(this.freeCameraPosition.position);
        this.controls.target.copy(this.freeCameraPosition.target);
        this.controls.update();
      }
    }
  }
  
  toggleTerrainMode() {
    return this.terrain.toggleTerrainMode();
  }
  
  updateCamera() {
    if (this.cameraMode === 'follow' && this.boat) {
      const boatPosition = this.boat.model.position;
      const boatRotation = this.boat.model.rotation.y;
      
      // Position camera behind boat
      const distance = 10;
      const height = 5;
      const x = boatPosition.x - Math.sin(boatRotation) * distance;
      const z = boatPosition.z - Math.cos(boatRotation) * distance;
      
      this.camera.position.set(x, this.waterLevel + height, z);
      this.camera.lookAt(boatPosition);
    }
  }
  
  handleWindowResize = () => {
    // Calculate size for 16:9 aspect ratio
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let width = windowWidth;
    let height = (width * 9) / 16;
    
    if (height > windowHeight) {
      height = windowHeight;
      width = (height * 16) / 9;
    }
    
    // Update canvas size
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Update renderer and camera
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  
  update(time) {
    // Update game components
    if (this.water) this.water.update(time);
    if (this.boat) this.boat.update(time, this.input.boatMovement, this.terrain);
    
    // Update camera if in follow mode
    this.updateCamera();
    
    // Update controls if enabled
    if (this.controls && this.controls.enabled) {
      this.controls.update();
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  animate = (time) => {
    this.update(time);
    this.render();
  }
  
  start() {
    this.renderer.setAnimationLoop(this.animate);
  }
  
  stop() {
    this.renderer.setAnimationLoop(null);
  }
}