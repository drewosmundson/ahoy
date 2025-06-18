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
    // FIX: Add missing currentLobby variable declaration
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      socket.to(currentLobby).emit('enemyProjectileFired', {
        playerId: socket.id, // Add playerId to identify who fired
        position: data.position,
        rotation: data.rotation,
        timestamp: data.timestamp || Date.now(), // Add timestamp if not provided
        sideOfBoat: data.sideOfBoat
      });
      
      console.log(`Player ${socket.id} fired projectile in lobby ${currentLobby}`);
    }
  }

  handleConnection(socket) {
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

    socket.on("newBoatPosition", (data) => {
      this.handleBoatMovement(socket, data);
    });

    socket.on('projectileFired', (data) => {
      this.handleProjectileFired(socket, data);
    });

    socket.on("debug", () => {
      console.log("Debug event received");
    });
  }

  handleDisconnection(socket) {
    // Game-specific cleanup if needed
    // Most cleanup is handled by LobbyManager
  }
}