export class InputController {
    constructor(game) {
      this.game = game;
      this.left = 1.5708;
      this.right = 4.71239;
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
      // Initialize scroll controls
      this.initScrollControls();
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
    
    initScrollControls() {
      // Add scroll wheel event listener
      // Note: The CameraController handles this directly on the canvas
      // This is here as a backup or for additional scroll functionality
      window.addEventListener('wheel', (event) => {
        this.handleScroll(event);
      }, { passive: false });
    }
    
    handleScroll(event) {
      // Optional: Handle scroll events here if needed
      // The CameraController already handles zoom when pointer is locked
      // You could add other scroll-based functionality here
      
      // Example: Scroll to change weapon or other game mechanics when not in pointer lock
      if (!this.game.cameraController?.isPointerLocked) {
        // Handle scroll for other purposes when not in camera lock mode
        // event.preventDefault(); // Uncomment if you want to prevent page scrolling
      }
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
          
        // Optional: Add zoom reset key
        case 'r':
          if (this.game.cameraController) {
            this.game.cameraController.resetZoom();
          }
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