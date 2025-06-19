// CameraController.js - Handles all camera-related functionality
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js';

export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.cameraMode = 'follow';
    
    // Mouse look properties
    this.mouseX = 0;
    this.mouseY = 0;
    this.cameraYaw = 0;
    this.cameraPitch = 0;
    this.mouseSensitivity = 0.002;
    this.isPointerLocked = false;
    this.maxPitch = Math.PI / 2 - 0.1;
    
    // Zoom properties for pointer-locked mode
    this.followDistance = 10; // Default distance
    this.minDistance = 3;     // Minimum zoom distance
    this.maxDistance = 25;    // Maximum zoom distance
    this.zoomSpeed = 1;       // Zoom sensitivity
    
    this.initControls();
    this.initMouseLook();
    this.initScrollZoom();
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.5;
    this.controls.update();
  }

  initMouseLook() {
    this.canvas.addEventListener('click', () => {
      this.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      if (this.isPointerLocked) {
        console.log('Pointer locked - mouse look enabled');
      } else {
        console.log('Pointer unlocked - mouse look disabled');
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        this.handleMouseMove(event);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isPointerLocked) {
        document.exitPointerLock();
      }
    });
  }

  initScrollZoom() {
    // Add wheel event listener for zoom control
    this.canvas.addEventListener('wheel', (event) => {
      if (this.isPointerLocked && this.cameraMode === 'follow') {
        event.preventDefault();
        this.handleScrollZoom(event);
      }
    }, { passive: false });
  }

  handleScrollZoom(event) {
    // Determine zoom direction (positive = zoom out, negative = zoom in)
    const zoomDelta = event.deltaY > 0 ? this.zoomSpeed : -this.zoomSpeed;
    
    // Update follow distance
    this.followDistance += zoomDelta;
    
    // Clamp the distance to min/max values
    this.followDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.followDistance));
    
    console.log(`Camera distance: ${this.followDistance.toFixed(1)}`);
  }

  requestPointerLock() {
    this.canvas.requestPointerLock();
  }

  addShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeStartTime = Date.now();
  }

  handleMouseMove(event) {
    if (!this.isPointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.cameraYaw -= movementX * this.mouseSensitivity;
    this.cameraPitch += movementY * this.mouseSensitivity * 0.5;
    
    if (this.cameraPitch >= 0.2) {
      this.cameraPitch = 0.2;
    }
    if (this.cameraPitch <= -0.2) {
      this.cameraPitch = -0.2;
    }
    
    this.cameraPitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.cameraPitch));
  }

  toggleCameraMode() {
    if (this.cameraMode === 'free') {
      this.cameraMode = 'follow';
      this.controls.enabled = false;
      this.freeCameraPosition = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone()
      };
    } else {
      this.cameraMode = 'free';
      this.controls.enabled = true;
      if (this.freeCameraPosition) {
        this.camera.position.copy(this.freeCameraPosition.position);
        this.controls.target.copy(this.freeCameraPosition.target);
        this.controls.update();
      }
    }
  }

  toggleMouseLook() {
    if (this.isPointerLocked) {
      document.exitPointerLock();
    } else {
      this.requestPointerLock();
    }
  }

  resetCameraRotation() {
    this.cameraYaw = 0;
    this.cameraPitch = 0;
  }

  // Method to reset zoom distance
  resetZoom() {
    this.followDistance = 10;
  }

  // Method to set zoom limits
  setZoomLimits(min, max) {
    this.minDistance = min;
    this.maxDistance = max;
    // Clamp current distance to new limits
    this.followDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.followDistance));
  }

  lookRight() {
    if (!this.isPointerLocked) {
      this.cameraYaw += 0.1;
    }
  }

  lookLeft() {
    if (!this.isPointerLocked) {
      this.cameraYaw -= 0.1;
    }
  }

  update(boat) {
    if (this.cameraMode === 'follow' && boat) {
      const boatPos = boat.model.position;
      const boatRot = boat.model.rotation.y;
      const waterLevel = boat.waterLevel;
      
      if (this.isPointerLocked) {
        // Mouse look camera - rotate around boat based on mouse input
        // Use dynamic follow distance for zoom
        const distance = this.followDistance;
        const height = 5;
        
        const x = boatPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * distance;
        const y = boatPos.y + Math.sin(this.cameraPitch) * distance + height;
        const z = boatPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * distance;
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(boatPos);
      } else {
        // Original follow camera behavior
        const distance = 10;
        const height = 5;
        const x = boatPos.x - Math.sin(boatRot) * distance;
        const z = boatPos.z - Math.cos(boatRot) * distance;

        this.camera.position.set(x, waterLevel + height, z);
        this.camera.lookAt(boatPos);
      }
    }

    // Update orbit controls when appropriate
    if (this.controls?.enabled && !this.isPointerLocked && this.cameraMode === 'free') {
      this.controls.update();
    }

    if (this.shakeIntensity > 0) {
      const elapsed = Date.now() - this.shakeStartTime;
      if (elapsed < this.shakeDuration) {
        const progress = elapsed / this.shakeDuration;
        const currentIntensity = this.shakeIntensity * (1 - progress);
        
        this.camera.position.x += (Math.random() - 0.5) * currentIntensity;
        this.camera.position.y += (Math.random() - 0.5) * currentIntensity;
      } else {
        this.shakeIntensity = 0;
      }
    }
  }

  cleanup() {
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }
}