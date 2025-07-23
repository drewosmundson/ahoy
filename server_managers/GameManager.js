// GameManager.js - Enhanced with hit detection and debugging
export class GameManager {
  constructor(io, lobbyManager) {
    this.io = io;
    this.lobbyManager = lobbyManager;
  }

  startGame(socket) {
    const currentLobby = socket.currentLobby;
    
    console.log("Start game button pressed");
    
    if (currentLobby && this.lobbyManager.getLobby(currentLobby) && 
        this.lobbyManager.getLobby(currentLobby).host === socket.id) {
      
      console.log("Current lobby host confirmed");
      
      this.lobbyManager.updateLobby(currentLobby, { gameStarted: true });
      this.io.to(currentLobby).emit("gameStarted");
      
      console.log("Game started for lobby", currentLobby);
    }
  }

  handleTerrainGenerated(socket, terrainData) {
    const currentLobby = socket.currentLobby;
    const lobby = this.lobbyManager.getLobby(currentLobby);
    
    if (currentLobby && lobby && lobby.host === socket.id) {
      this.lobbyManager.updateLobby(currentLobby, {
        terrainData: terrainData,
        gameStarted: true
      });

      const gameStartedData = {
        terrainData: terrainData.terrainData
      };

      socket.to(currentLobby).emit("gameStarted", gameStartedData);
      socket.to(currentLobby).emit("terrainDataReceived", gameStartedData);
    }
  }

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

  handleDebug(socket, data) {
    const currentLobby = socket.currentLobby;
    console.log(`Debug from ${socket.id} in lobby ${currentLobby}:`, data);
    
    // Optionally broadcast debug info to other clients for testing
    if (currentLobby && data) {
      socket.to(currentLobby).emit('debugInfo', {
        from: socket.id,
        data: data,
        timestamp: Date.now()
      });
    }
  }

  handleConnection(socket) {
    console.log(`Player ${socket.id} connected for game events`);
    
    // Game-related event handlers
    socket.on("startGame", (data) => {
      this.startGame(socket, data);
    });

    socket.on("terrainGenerated", (terrainData) => {
      this.handleTerrainGenerated(socket, terrainData);
    });

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
          playerId: data.playerId,
          destroyer: socket.id,
          timestamp: Date.now()
        });
      }
    });
  }

  handleDisconnection(socket) {
    console.log(`Player ${socket.id} disconnected from game`);
    // Game-specific cleanup if needed
    // Most cleanup is handled by LobbyManager
  }
}