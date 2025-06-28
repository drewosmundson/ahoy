import { HeightmapGenerator } from '../server_utils/HeightmapGenerator.js';

export class LobbyManager {
  constructor(io) {
    this.io = io;
    this.lobbies = {};
  }

  generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }


  createLobby(socket, data) {
    const lobbyCode = this.generateLobbyCode();
    const lobbyName = data?.lobbyName || `Lobby ${lobbyCode}`;
    const heightmapGenerator = new HeightmapGenerator();
    const heightmap = heightmapGenerator.heightmap;
    const heightmapOverlay = heightmapGenerator.heightmapOverlay;
    
    // Debug output
    this.printArrayValues(heightmap);

    this.lobbies[lobbyCode] = {
      id: lobbyCode,
      host: socket.id,
      heightmap: heightmap,
      heightmapOverlay: heightmapOverlay,
      players: [{
        id: socket.id,
        name: `Player ${socket.id.substr(0, 4)}`,
        isHost: true,
        health: 100,
        maxHealth: 100,
        alive: true
      }],
      settings: {
        gameMode: "noBots",
        terrainType: "default"
      },
      gameStarted: false,
      chatMessages: []
    };

    socket.join(lobbyCode);
    socket.currentLobby = lobbyCode;

    console.log(`Lobby created: ${lobbyCode} by ${socket.id}`);

    socket.emit("lobbyCreated", {
      lobbyId: lobbyCode,
      lobbyName,
      players: this.lobbies[lobbyCode].players,
      heightmap: this.lobbies[lobbyCode].heightmap,
      heightmapOverlay: this.lobbies[lobbyCode].heightmapOverlay
    });
  }

  joinLobby(socket, data) {
    const { lobbyId } = data;

    if (this.lobbies[lobbyId]) {
      const playerData = {
        id: socket.id,
        name: `Player ${socket.id.substr(0, 4)}`,
        isHost: false,
        health: 100,
        maxHealth: 100,
        alive: true
      };

      this.lobbies[lobbyId].players.push(playerData);
      socket.join(lobbyId);
      socket.currentLobby = lobbyId;

      console.log(`Player ${socket.id} joined lobby ${lobbyId}`);

      const lobby = this.lobbies[lobbyId];

      // Send player the current lobby state
      socket.emit("lobbyJoined", {
        lobbyId,
        lobbyName: lobby.name,
        players: lobby.players,
        heightmap: lobby.heightmap,
        heightmapOverlay: lobby.heightmapOverlay,
        gameStarted: lobby.gameStarted
      });

      // If game is already started, send terrain data
      if (lobby.gameStarted && lobby.terrainData) {
        socket.emit("gameStarted", {
          terrainData: lobby.terrainData.terrainData
        });
      }

      // Notify others about updated player list
      socket.to(lobbyId).emit("lobbyUpdated", {
        players: lobby.players
      });
    } else {
      socket.emit("error", { message: "Lobby not found" });
    }
  }

  leaveLobby(socket) {
    const currentLobby = socket.currentLobby;
    
    if (currentLobby && this.lobbies[currentLobby]) {
      this.lobbies[currentLobby].players = this.lobbies[currentLobby].players.filter(
        player => player.id !== socket.id
      );

      console.log(`Player ${socket.id} left lobby ${currentLobby}`);

      // Handle host transfer or lobby deletion
      if (this.lobbies[currentLobby].host === socket.id) {
        if (this.lobbies[currentLobby].players.length > 0) {
          const newHost = this.lobbies[currentLobby].players[0];
          this.lobbies[currentLobby].host = newHost.id;
          newHost.isHost = true;
          this.io.to(newHost.id).emit("becameHost");
        } else {
          delete this.lobbies[currentLobby];
          socket.currentLobby = null;
          return;
        }
      }

      socket.leave(currentLobby);

      if (this.lobbies[currentLobby]) {
        this.io.to(currentLobby).emit("lobbyUpdated", {
          players: this.lobbies[currentLobby].players
        });
      }

      socket.currentLobby = null;
    }
  }

  confirmGameStart(socket, data) {
    const { lobbyId, socketId } = data;

    if (this.lobbies[lobbyId]) {
      const existingPlayer = this.lobbies[lobbyId].players.find(p => p.id === socketId);

      if (!existingPlayer) {
        const wasHost = this.lobbies[lobbyId].host === socketId;
        const playerIndex = this.lobbies[lobbyId].players.findIndex(p =>
          p.id !== socketId && p.isHost === wasHost
        );

        if (playerIndex !== -1) {
          this.lobbies[lobbyId].players[playerIndex].id = socket.id;
          if (wasHost) {
            this.lobbies[lobbyId].host = socket.id;
          }
        }
      }

      socket.join(lobbyId);
      socket.currentLobby = lobbyId;
    }
  }

  handleDisconnection(socket) {
    for (const lobbyId in this.lobbies) {
      const lobby = this.lobbies[lobbyId];
      const index = lobby.players.findIndex(p => p.id === socket.id);

      if (index !== -1) {
        const wasHost = lobby.players[index].isHost;

        // Remove player
        lobby.players.splice(index, 1);
        console.log(`Removing disconnected player: ${socket.id} from lobby ${lobbyId}`);

        // Promote new host if necessary
        if (wasHost && lobby.players.length > 0) {
          lobby.players[0].isHost = true;
          lobby.host = lobby.players[0].id;
          console.log(`Promoting new host: ${lobby.players[0].id}`);
        }

        // Delete empty lobby
        if (lobby.players.length === 0) {
          delete this.lobbies[lobbyId];
          console.log(`Deleted empty lobby ${lobbyId}`);
        } else {
          // Notify remaining players
          this.io.to(lobbyId).emit("lobbyUpdated", {
            players: lobby.players
          });
        }

        break;
      }
    }
  }

  handleConnection(socket) {
    // Lobby-related event handlers
    socket.on("createLobbyRequest", (data) => {
      this.createLobby(socket, data);
    });

    socket.on("joinLobbyRequest", (data) => {
      this.joinLobby(socket, data);
    });

    socket.on("leaveLobbyRequest", () => {
      this.leaveLobby(socket);
    });

    socket.on("confirmGameStart", (data) => {
      this.confirmGameStart(socket, data);
    });
  }

  // Getters for other managers
  getLobby(lobbyId) {
    return this.lobbies[lobbyId];
  }

  updateLobby(lobbyId, updateData) {
    if (this.lobbies[lobbyId]) {
      Object.assign(this.lobbies[lobbyId], updateData);
    }
  }

  // Debugging utility
  printArrayValues(array) {
    let values = [];
    array.forEach(function(item) { values.push(item); });
    console.log(values);
  }
}