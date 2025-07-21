
export class InputController {
    constructor(game) {
      this.game = game;
      this.right = 1.5708;
      this.left = 4.71239;
      // Boat movement state
      this.boatMovement = {
        forward: false,
        backward: false,
        left: false,
        right: false
      };
      // Initialize keyboard controls
      this.initKeyboardControls();
      // Initialize mouse controls
      this.initMouseControls();
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
    
    initMouseControls() {
      // Add mouse click event listener
      window.addEventListener('mousedown', (event) => {
        this.handleMouseDown(event);
      });
      
      // Prevent context menu on right click (optional)
      window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
      });
    }
    
    handleMouseDown(event) {
      switch(event.button) {
        case 0: // Left mouse button
          this.game.playerFiredProjectile(this.left);
          break;
        case 2: // Right mouse button
          this.game.playerFiredProjectile(this.right);
          break;
      }
    }
    
    handleKeyDown(event) {
      switch(event.key) {
        // Movement controls
        case 'w':
        case 'W':
        case 'ArrowUp':
          this.boatMovement.forward = true;
          break;
        case 's':
        case 'S':
        case 'ArrowDown':
          this.boatMovement.backward = true;
          break;
        case 'a':
        case 'A':
        case 'ArrowLeft':
          this.boatMovement.left = true;
          break;
        case 'd':
        case 'D':
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
          
        // Removed Q and E key controls - now using mouse
        // case 'e':
        //   this.game.fireProjectile(this.right);
        //   break;
        // case 'q':
        //   this.game.fireProjectile(this.left);
        //   break;
      }
    }
    
    handleKeyUp(event) {
      switch(event.key) {
        case 'w':
        case 'W':
        case 'ArrowUp':
          this.boatMovement.forward = false;
          break;
        case 's':
        case 'S':
        case 'ArrowDown':
          this.boatMovement.backward = false;
          break;
        case 'a':
        case 'A':
        case 'ArrowLeft':
          this.boatMovement.left = false;
          break;
        case 'd':
        case 'D':
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