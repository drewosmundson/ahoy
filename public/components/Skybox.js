// Skybox.js - Handles skybox creation and loading
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Skybox {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    
    // Skybox image paths
    this.imagePaths = {
      posX: 'resources/images/sideSky.png',
      negX: 'resources/images/sideSky.png',
      posY: 'resources/images/topSky.png',
      negY: 'resources/images/topSky.png',
      posZ: 'resources/images/sideSky.png',
      negZ: 'resources/images/sideSky.png'
    };
    
    // Load skybox textures
    this.loadSkybox();
  }
  
  loadSkybox() {
    // Create texture loader
    const loader = new THREE.TextureLoader();
    
    // Storage for loaded textures
    const textures = {
      right: null,
      left: null,
      top: null,
      bottom: null,
      front: null,
      back: null
    };
    
    // Tracking for loaded textures
    let loadedCount = 0;
    const totalTextures = 6;
    
    // Function to create skybox once textures are loaded
    const createSkybox = () => {
      // Map of sides to texture variables
      const sides = ['right', 'left', 'top', 'bottom', 'front', 'back'];
      
      // Default colors for fallback
      const defaultColors = [
        0x3366ff, // right
        0x3366ff, // left
        0x99ccff, // top
        0x336633, // bottom
        0x3366ff, // front
        0x3366ff  // back
      ];
      
      // Create materials
      const materials = sides.map((side, index) => {
        // Use texture if loaded, otherwise use fallback color
        if (textures[side]) {
          return new THREE.MeshBasicMaterial({
            map: textures[side],
            side: THREE.BackSide
          });
        } else {
          return new THREE.MeshBasicMaterial({
            color: defaultColors[index],
            side: THREE.BackSide
          });
        }
      });
      
      // Create skybox geometry
      const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
      
      // Create mesh and add to scene
      this.mesh = new THREE.Mesh(geometry, materials);
      this.scene.add(this.mesh);
      
      console.log(`Skybox created with ${loadedCount} of ${totalTextures} textures loaded`);
    };
    
    // Helper to load a single texture
    const loadTexture = (path, side) => {
      loader.load(
        path,
        // Success handler
        (texture) => {
          textures[side] = texture;
          loadedCount++;
          
          if (loadedCount === totalTextures) {
            createSkybox();
          }
        },
        // Progress handler
        undefined,
        // Error handler
        (error) => {
          console.warn(`Failed to load skybox texture ${side}: ${error.message}`);
          loadedCount++;
          
          if (loadedCount === totalTextures) {
            createSkybox();
          }
        }
      );
    };
    
    // Start loading textures
    loadTexture(this.imagePaths.posX, 'right');
    loadTexture(this.imagePaths.negX, 'left');
    loadTexture(this.imagePaths.posY, 'top');
    loadTexture(this.imagePaths.negY, 'bottom');
    loadTexture(this.imagePaths.posZ, 'front');
    loadTexture(this.imagePaths.negZ, 'back');
    
    // Timeout as fallback if textures fail to load
    setTimeout(() => {
      if (loadedCount < totalTextures) {
        console.warn('Timed out waiting for skybox textures, creating skybox with loaded textures only');
        createSkybox();
      }
    }, 10000); // 10 second timeout
  }
}