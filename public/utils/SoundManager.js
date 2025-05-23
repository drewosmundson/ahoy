// SoundManager.js - Handles all game audio
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';

export class SoundManager {
  constructor(camera) {
    // Create audio listener and attach to camera
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    
    // Sound collections
    this.backgroundMusic = {};
    this.soundEffects = {};
    this.currentMusic = null;
    
    // Master volume controls
    this.masterVolume = 1.0;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
    
    // Track loading state
    this.loading = {};
    this.loadCallbacks = {};
  }
  
  // Load a background music track
  loadBackgroundMusic(name, path, onLoaded = null) {
    this.loading[name] = true;
    
    const audio = new THREE.Audio(this.listener);
    this.backgroundMusic[name] = audio;
    
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(path, (buffer) => {
      audio.setBuffer(buffer);
      audio.setLoop(true);
      audio.setVolume(this.musicVolume * this.masterVolume);
      
      this.loading[name] = false;
      console.log(`Background music loaded: ${name}`);
      
      if (onLoaded) onLoaded(name);
      if (this.loadCallbacks[name]) {
        this.loadCallbacks[name].forEach(callback => callback());
        delete this.loadCallbacks[name];
      }
    });
    
    return audio;
  }
  
  // Load a sound effect
  loadSoundEffect(name, path, onLoaded = null) {
    this.loading[name] = true;
    
    const audio = new THREE.Audio(this.listener);
    this.soundEffects[name] = audio;
    
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(path, (buffer) => {
      audio.setBuffer(buffer);
      audio.setLoop(false);
      audio.setVolume(this.sfxVolume * this.masterVolume);
      
      this.loading[name] = false;
      console.log(`Sound effect loaded: ${name}`);
      
      if (onLoaded) onLoaded(name);
      if (this.loadCallbacks[name]) {
        this.loadCallbacks[name].forEach(callback => callback());
        delete this.loadCallbacks[name];
      }
    });
    
    return audio;
  }
  
  // Load a positional 3D sound effect
  loadPositionalSound(name, path, object, onLoaded = null) {
    this.loading[name] = true;
    
    const audio = new THREE.PositionalAudio(this.listener);
    object.add(audio); // Attach to 3D object
    this.soundEffects[name] = audio;
    
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(path, (buffer) => {
      audio.setBuffer(buffer);
      audio.setLoop(false);
      audio.setVolume(this.sfxVolume * this.masterVolume);
      audio.setRefDistance(20); // Distance model parameters
      audio.setRolloffFactor(1);
      
      this.loading[name] = false;
      console.log(`Positional sound loaded: ${name}`);
      
      if (onLoaded) onLoaded(name);
      if (this.loadCallbacks[name]) {
        this.loadCallbacks[name].forEach(callback => callback());
        delete this.loadCallbacks[name];
      }
    });
    
    return audio;
  }
  
  // Play background music with crossfade
  playMusic(name, fadeTime = 1.0) {
    if (!this.backgroundMusic[name]) {
      console.warn(`Music ${name} not found`);
      return;
    }
    
    const playMusicAction = () => {
      const newTrack = this.backgroundMusic[name];
      
      // If another track is playing, fade it out
      if (this.currentMusic && this.currentMusic.isPlaying) {
        const oldTrack = this.currentMusic;
        const oldVolume = oldTrack.getVolume();
        
        // Fade out current track
        const fadeOutInterval = setInterval(() => {
          if (oldTrack.getVolume() > 0.01) {
            oldTrack.setVolume(oldTrack.getVolume() - oldVolume * 0.05);
          } else {
            oldTrack.stop();
            clearInterval(fadeOutInterval);
          }
        }, 50);
      }
      
      // Start new track at 0 volume and fade in
      newTrack.setVolume(0);
      newTrack.play();
      
      const targetVolume = this.musicVolume * this.masterVolume;
      const fadeInInterval = setInterval(() => {
        if (newTrack.getVolume() < targetVolume * 0.95) {
          newTrack.setVolume(newTrack.getVolume() + targetVolume * 0.05);
        } else {
          newTrack.setVolume(targetVolume);
          clearInterval(fadeInInterval);
        }
      }, 50);
      
      this.currentMusic = newTrack;
    };
    
    // If the sound is still loading, queue it to play when ready
    if (this.loading[name]) {
      if (!this.loadCallbacks[name]) {
        this.loadCallbacks[name] = [];
      }
      this.loadCallbacks[name].push(playMusicAction);
      console.log(`Music ${name} will play when loaded`);
    } else {
      playMusicAction();
    }
  }
  
  // Play a sound effect
  playSound(name, volumeScale = 1.0) {
    if (!this.soundEffects[name]) {
      console.warn(`Sound effect ${name} not found`);
      return;
    }
    
    const playSoundAction = () => {
      const sound = this.soundEffects[name];
      
      // If it's already playing, clone it for overlapping sounds
      if (sound.isPlaying) {
        const soundClone = sound.clone();
        soundClone.setVolume(this.sfxVolume * this.masterVolume * volumeScale);
        soundClone.play();
        // Auto cleanup when done playing
        soundClone.onEnded = () => {
          this.listener.remove(soundClone);
        };
      } else {
        sound.setVolume(this.sfxVolume * this.masterVolume * volumeScale);
        sound.play();
      }
    };
    
    // If the sound is still loading, queue it to play when ready
    if (this.loading[name]) {
      if (!this.loadCallbacks[name]) {
        this.loadCallbacks[name] = [];
      }
      this.loadCallbacks[name].push(playSoundAction);
      console.log(`Sound ${name} will play when loaded`);
    } else {
      playSoundAction();
    }
  }
  
  // Stop a specific sound effect
  stopSound(name) {
    if (this.soundEffects[name] && this.soundEffects[name].isPlaying) {
      this.soundEffects[name].stop();
    }
  }
  
  // Stop background music
  stopMusic() {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.stop();
    }
  }
  
  // Pause all audio
  pauseAll() {
    // Pause music
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.pause();
    }
    
    // Pause all sound effects
    Object.values(this.soundEffects).forEach(sound => {
      if (sound.isPlaying) {
        sound.pause();
      }
    });
  }
  
  // Resume all audio
  resumeAll() {
    // Resume music
    if (this.currentMusic && !this.currentMusic.isPlaying) {
      this.currentMusic.play();
    }
    
    // Resume sound effects (usually not needed as they're one-shots)
    Object.values(this.soundEffects).forEach(sound => {
      if (sound.buffer && !sound.isPlaying) {
        sound.play();
      }
    });
  }
  
  // Set master volume
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }
  
  // Set music volume
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolumes();
  }
  
  // Set sound effects volume
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateSfxVolumes();
  }
  
  // Update volume for all audio
  updateAllVolumes() {
    this.updateMusicVolumes();
    this.updateSfxVolumes();
  }
  
  // Update volume for background music
  updateMusicVolumes() {
    Object.values(this.backgroundMusic).forEach(music => {
      music.setVolume(this.musicVolume * this.masterVolume);
    });
  }
  
  // Update volume for sound effects
  updateSfxVolumes() {
    Object.values(this.soundEffects).forEach(sound => {
      sound.setVolume(this.sfxVolume * this.masterVolume);
    });
  }
  
  // Cleanup resources when destroying
  dispose() {
    // Stop and disconnect all sounds
    Object.values(this.backgroundMusic).forEach(music => {
      if (music.isPlaying) music.stop();
    });
    
    Object.values(this.soundEffects).forEach(sound => {
      if (sound.isPlaying) sound.stop();
    });
    
    // Remove audio listener from camera
    if (this.listener.parent) {
      this.listener.parent.remove(this.listener);
    }
  }
}