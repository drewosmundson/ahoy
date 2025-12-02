// Game Manager Class handles all of the communication from servers to
// lobbies that have started a game
export class GameManager {


  handlePlayerMovement(socket, data) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      socket.to(currentLobby).emit('playerUpdate', {
        ...data,
        playerId: socket.id
      });
    }
  }

  handleBoatMovement(socket, data) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      socket.to(currentLobby).emit("enemyBoatMovement", {
        playerId: socket.id,
        ...data
      });
    }
  }

  handleProjectileFired(socket, data) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      socket.to(currentLobby).emit('enemyProjectileFired', {
        playerId: socket.id,
        position: data.position,
        rotation: data.rotation,
        timestamp: data.timestamp || Date.now(),
        sideOfBoat: data.sideOfBoat
      });
      
      console.log(`Player ${socket.id} fired projectile in lobby ${currentLobby}`);
    }
  }

  handleBoatHit(socket, data) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      console.log(`Player ${socket.id} hit player ${data.targetPlayerId} for ${data.damage} damage`);
      
      // Notify all players in the lobby about the hit
      this.io.to(currentLobby).emit('boatHit', {
        attackerId: socket.id,
        targetPlayerId: data.targetPlayerId,
        damage: data.damage,
        hitPosition: data.hitPosition,
        timestamp: Date.now()
      });
    }
  }



  handleConnection(socket) {
    // Game-related event handlers
    socket.on('playerUpdate', (data) => {
      this.handlePlayerMovement(socket, data);
    });

    socket.on('projectileFired', (data) => {
      this.handleProjectileFired(socket, data);
    });

    // NEW: Enhanced debug and hit detection handlers
    socket.on("debug", (data) => {
      this.handleDebug(socket, data);
    });

    socket.on('boatHit', (data) => {
      this.handleBoatHit(socket, data);
    });

    socket.on('boatDestroyed', (data) => {
      const currentLobby = socket.currentLobby;
      if (currentLobby) {
        console.log(`Boat destroyed: ${data.playerId}`);
        this.io.to(currentLobby).emit('boatDestroyed', {
          position: data.position,
          playerId: data.playerId,
          destroyer: socket.id,
          timestamp: Date.now()
        });
      }
    });
  }

  handleDisconnection(socket) {
    // Game-specific cleanup if needed
    // Most cleanup is handled by LobbyManager
  }
}