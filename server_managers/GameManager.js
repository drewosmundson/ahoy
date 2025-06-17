export class GameManager {
  constructor(io, lobbyManager) {
    this.io = io;
    this.lobbyManager = lobbyManager;
  }

  startGame(socket, data) {
    const { lobbyId } = data;
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
          timestamp: data.timestamp,
          sideOfBoat: data.sideOfBoat,
          ownerId: socket.id // Ensure ownership is clear
        });
        
        console.log(`Player ${socket.id} fired projectile in lobby ${currentLobby}`);
      }
    }

    handleProjectileHit(socket, data) {
    const currentLobby = socket.currentLobby;
    const lobby = this.lobbyManager.getLobby(currentLobby);
    
    if (!currentLobby || !lobby) return;

    const { hitType, targetPlayerId, attackerPlayerId, damage, hitPosition, timestamp } = data;
    
    // Validate hit data
    if (!attackerPlayerId || !targetPlayerId || damage === undefined) {
      console.warn('Invalid hit data received:', data);
      return;
    }
    
    // Ensure the attacker is the one sending the hit event
    if (attackerPlayerId !== socket.id) {
      console.warn(`Hit validation failed: ${socket.id} tried to send hit for ${attackerPlayerId}`);
      return;
    }
    
    console.log(`Projectile hit validated: ${attackerPlayerId} hit ${targetPlayerId} for ${damage} damage`);
    
    // Find the target player and apply damage
    const targetPlayer = lobby.players.find(p => p.id === targetPlayerId);
    
    if (targetPlayer && targetPlayer.alive) {
      const previousHealth = targetPlayer.health;
      targetPlayer.health = Math.max(0, targetPlayer.health - damage);
      
      console.log(`${targetPlayerId} health: ${previousHealth} -> ${targetPlayer.health}`);
      
      // Check if player is killed
      if (targetPlayer.health <= 0) {
        targetPlayer.alive = false;
        console.log(`Player ${targetPlayerId} was killed by ${attackerPlayerId}`);
        
        // Broadcast player death
        this.io.to(currentLobby).emit('playerKilled', {
          killedPlayerId: targetPlayerId,
          killerPlayerId: attackerPlayerId,
          timestamp: timestamp
        });
      }
      
      // Broadcast hit information to all players in lobby
      this.io.to(currentLobby).emit('playerHit', {
        attackerPlayerId: attackerPlayerId,
        targetPlayerId: targetPlayerId,
        damage: damage,
        newHealth: targetPlayer.health,
        hitPosition: hitPosition,
        timestamp: timestamp
      });
      
      // Update lobby player list
      this.io.to(currentLobby).emit("lobbyUpdated", {
        players: lobby.players
      });
      
      // Check for game end conditions
      const alivePlayers = lobby.players.filter(p => p.alive);
      if (alivePlayers.length <= 1) {
        this.io.to(currentLobby).emit('gameOver', {
          winner: alivePlayers.length === 1 ? alivePlayers[0] : null,
          timestamp: Date.now()
        });
      }
    } else {
      console.warn(`Target player ${targetPlayerId} not found or already dead`);
    }
  }

  handlePlayerHeal(socket, data) {
    const currentLobby = socket.currentLobby;
    const lobby = this.lobbyManager.getLobby(currentLobby);
    
    if (!currentLobby || !lobby) return;

    const { healAmount } = data;
    const player = lobby.players.find(p => p.id === socket.id);
    
    if (player && player.alive) {
      player.health = Math.min(player.maxHealth, player.health + healAmount);
      
      // Broadcast healing to all players
      this.io.to(currentLobby).emit('playerHealed', {
        playerId: socket.id,
        healAmount: healAmount,
        newHealth: player.health,
        timestamp: Date.now()
      });
      
      // Update lobby player list
      this.io.to(currentLobby).emit("lobbyUpdated", {
        players: lobby.players
      });
    }
  }

  handleProjectileImpact(socket, data) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      socket.to(currentLobby).emit('enemyProjectileImpact', {
        playerId: socket.id,
        position: data.position,
        timestamp: data.timestamp
      });
    }
  }

  handleGameAction(socket, action) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby) {
      socket.to(currentLobby).emit("playerGameAction", {
        playerId: socket.id,
        ...action
      });
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

    socket.on('projectileHit', (data) => {
      this.handleProjectileHit(socket, data);
    });

    socket.on('playerHeal', (data) => {
      this.handlePlayerHeal(socket, data);
    });

    socket.on('projectileImpact', (data) => {
      this.handleProjectileImpact(socket, data);
    });

    socket.on("gameAction", (action) => {
      this.handleGameAction(socket, action);
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