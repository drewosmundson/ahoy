// InputController.js - Handles user input for game controls

export class InputController {
    constructor(game) {
      this.game = game;
      
      // Boat movement state
      this.boatMovement = {
        forward: false,
        backward: false,
        left: false,
        right: false
      };
      // Initialize keyboard controls
      this.initKeyboardControls();
    }
    
    initKeyboardControls() {
      // Add keydown event listener
      window.addEventListener('keydown', (event) => {
        this.handleKeyDown(event);
      });
      
      // Add keyup event listener
      window.addEventListener('keyup', (event) => {
        this.handleKeyUp(event);
      });
    }
    
    handleKeyDown(event) {
      switch(event.key) {
        // Movement controls
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
          
        // Camera mode toggle
        case 'c':
          this.game.toggleCameraMode();
          break;
          
        // Terrain mode toggle
        case 'p':
          this.game.toggleTerrainMode();
          break;

        case 'f':
          this.game.toggleFog();
          break;
          
        // Add more controls as needed
      }
    }
    
    handleKeyUp(event) {
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
    }
    
    // Add touch controls for mobile devices
    addTouchControls() {
      // This can be implemented later if needed
      console.log("Touch controls not yet implemented");
    }
    
    // Method to reset all movement states
    resetMovement() {
      this.boatMovement.forward = false;
      this.boatMovement.backward = false;
      this.boatMovement.left = false;
      this.boatMovement.right = false;
    }
  }