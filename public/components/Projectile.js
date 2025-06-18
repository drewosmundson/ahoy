// handles creation distruction and animations of projectiles the classes that inherit should
// keep track of projectiles and if they have hit another boat or
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class Projectile {
  constructor(scene, waterLevel, terrain, boatPositionX, boatPositionZ, rotation, sideOfBoat) {
    this.scene = scene; 
    this.waterLevel = waterLevel;
    this.terrain = terrain;
    this.rotation = rotation;
    this.sideOfBoat = sideOfBoat;
    
    // Physics properties
    this.initialSpeed = 25;
    this.launchAngle = Math.PI / 9;
    this.gravity = 9.8;
    
    // Velocity components
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
    
    // Time tracking
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;

    // Create projectile model
    this.model = this.createProjectileModel();
    this.setPositionAndRotation(boatPositionX, waterLevel, boatPositionZ, rotation, sideOfBoat )
    
    // Add to scene
    this.scene.add(this.model);
    
    // Flag to track if projectile is active
    this.isActive = true;
    this.hasHit = false; // Prevent multiple hits
  }
  
  createProjectileModel() {
    const projectile = new THREE.Group();
    
    const sphereGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2F2F2F,
      metalness: 0.8,
      roughness: 0.2
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    projectile.add(sphereMesh);
    
    return projectile;
  }
  
  setPositionAndRotation(x, y, z, rotation, sideOfBoat) {
    if (!this.model) return;
    
    this.model.position.set(x, y, z);
    const launchDirection = rotation + sideOfBoat;
    
    // Calculate initial velocity components
    this.velocityX = Math.sin(launchDirection) * this.initialSpeed * Math.cos(this.launchAngle);
    this.velocityY = this.initialSpeed * Math.sin(this.launchAngle);
    this.velocityZ = Math.cos(launchDirection) * this.initialSpeed * Math.cos(this.launchAngle);
  }
  

  
  update(deltaTime) {
    if (!this.model || !this.isActive || this.hasHit) return false;
    
    const dt = deltaTime * 0.001;
    
    // Apply gravity
    this.velocityY -= this.gravity * dt;
    
    // Update position
    this.model.position.x += this.velocityX * dt;
    this.model.position.y += this.velocityY * dt;
    this.model.position.z += this.velocityZ * dt;
    
    const currentPos = this.model.position;
    
    // Check water collision
    if (currentPos.y <= this.waterLevel) {
      console.log('Projectile hit water!');
      this.createWaterSplash();
      this.destroy();
      return false;
    }
    
    // Check terrain collision
    if (this.terrain) {
      const terrainHeight = this.terrain.getHeightAt(currentPos.x, currentPos.z);
      if (currentPos.y <= terrainHeight) {
        console.log('Projectile hit terrain!');
        this.createTerrainImpact();
        this.destroy();
        return false;
      }
    }
    
    // Check bounds
    const maxDistance = 500;
    if (Math.abs(currentPos.x) > maxDistance || Math.abs(currentPos.z) > maxDistance) {
      console.log('Projectile out of bounds!');
      this.destroy();
      return false;
    }
    
    // Visual rotation
    this.model.rotation.x += 0.1;
    this.model.rotation.z += 0.05;
    
    return true;
  }
  
  createWaterSplash() {
    const splashGeometry = new THREE.CylinderGeometry(0.5, 2, 3, 8);
    const splashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4169E1,
      transparent: true,
      opacity: 0.9
    });
    const splash = new THREE.Mesh(splashGeometry, splashMaterial);
    splash.position.set(this.model.position.x, this.waterLevel, this.model.position.z);
    
    this.scene.add(splash);
    
    const startTime = Date.now();
    const duration = 800;
    
    const animateSplash = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(splash);
        splash.geometry.dispose();
        splash.material.dispose();
        return;
      }
      
      const scale = 1 + progress * 1.5;
      splash.scale.set(scale, 1 + progress * 2, scale);
      splash.material.opacity = 0.6 * (1 - progress);
      
      requestAnimationFrame(animateSplash);
    };
    
    animateSplash();
  }
  
  createTerrainImpact() {
    const dustGeometry = new THREE.SphereGeometry(1, 8, 8);
    const dustMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x8B4513,
      transparent: true,
      opacity: 0.9
    });
    const dust = new THREE.Mesh(dustGeometry, dustMaterial);
    dust.position.copy(this.model.position);
    
    this.scene.add(dust);
    
    const startTime = Date.now();
    const duration = 600;
    
    const animateDust = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(dust);
        dust.geometry.dispose();
        dust.material.dispose();
        return;
      }
      
      const scale = 1 + progress * 3;
      dust.scale.set(scale, scale, scale);
      dust.material.opacity = 0.5 * (1 - progress);
      dust.position.y += 0.1;
      
      requestAnimationFrame(animateDust);
    };
    
    animateDust();
  }
  
createHitEffect(position = null) {
  // Use provided position or current projectile position
  const hitPosition = position || this.getPosition();
  
  console.log('Creating hit effect at position:', hitPosition);
  
  // Create explosion effect at hit location
  const explosionGeometry = new THREE.SphereGeometry(2, 12, 12);
  const explosionMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFF4500,
    transparent: true,
    opacity: 0.8
  });
  const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
  explosion.position.copy(hitPosition);
  
  this.scene.add(explosion);
  
  // Create particle effects
  this.createParticleExplosion(hitPosition);
  
  // Animate explosion
  const startTime = Date.now();
  const duration = 600;
  
  const animateExplosion = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      this.scene.remove(explosion);
      explosion.geometry.dispose();
      explosion.material.dispose();
      return;
    }
    
    const scale = 1 + progress * 3;
    explosion.scale.set(scale, scale, scale);
    explosion.material.opacity = 0.8 * (1 - progress);
    
    requestAnimationFrame(animateExplosion);
  };
  
  animateExplosion();
}

createParticleExplosion(position) {
  // Create multiple small particles for more dramatic effect
  for (let i = 0; i < 8; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.3, 6, 6);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xFF4500 : 0xFFFF00,
      transparent: true,
      opacity: 0.8
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    particle.position.copy(position);
    
    // Random velocity for each particle
    const velocity = {
      x: (Math.random() - 0.5) * 10,
      y: Math.random() * 8 + 2,
      z: (Math.random() - 0.5) * 10
    };
    
    this.scene.add(particle);
    
    const startTime = Date.now();
    const duration = 800;
    
    const animateParticle = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        return;
      }
      
      // Apply gravity and movement
      particle.position.x += velocity.x * 0.02;
      particle.position.y += velocity.y * 0.02 - (progress * 5); // Gravity
      particle.position.z += velocity.z * 0.02;
      
      particle.material.opacity = 0.8 * (1 - progress);
      
      requestAnimationFrame(animateParticle);
    };
    
    animateParticle();
  }
}

  destroy() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.scene && this.model) {
      this.scene.remove(this.model);
      
      this.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  getPosition() {
    return this.model ? this.model.position.clone() : new THREE.Vector3();
  }
  
  isProjectileActive() {
    return this.isActive;
  }
}
