import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { HeightmapGenerator } from './HeightmapGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const lobbies = {};

function generateLobbyCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
function printArrayValues(array){
  let values = [];
  array.forEach(function(item) { values.push(item); });
  console.log(values);
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentLobby = null;

  socket.on("createLobbyRequest", (data) => {
    const lobbyCode = generateLobbyCode();
    const lobbyName = data?.lobbyName || `Lobby ${lobbyCode}`;
    const heightmapGenerator = new HeightmapGenerator();
    const heightmap = heightmapGenerator.heightmap;
    const heightmapOverlay = heightmapGenerator.heightmapOverlay;
    printArrayValues(heightmap);

    lobbies[lobbyCode] = {
      id: lobbyCode,
      host: socket.id,
      heightmap: heightmap,
      heightmapOverlay: heightmapOverlay,
      players: [{
        id: socket.id,
        name: `Player ${socket.id.substr(0, 4)}`,
        isHost: true
      }],
      settings: {
        gameMode: "noBots",
        terrainType: "default"
      },
      gameStarted: false,
      chatMessages: []
    };

    socket.join(lobbyCode);
    currentLobby = lobbyCode;

    console.log(`Lobby created: ${lobbyCode} by ${socket.id}`);

    socket.emit("lobbyCreated", {
      lobbyId: lobbyCode,
      lobbyName,
      players: lobbies[lobbyCode].players,
      heightmap: lobbies[lobbyCode].heightmap,
      heightmapOverlay: lobbies[lobbyCode].heightmapOverlay
    });
  });
  socket.on("joinLobbyRequest", (data) => {
    const { lobbyId } = data;

    if (lobbies[lobbyId]) {
      const playerData = {
        id: socket.id,
        name: `Player ${socket.id.substr(0, 4)}`,
        isHost: false
      };

      lobbies[lobbyId].players.push(playerData);
      socket.join(lobbyId);
      currentLobby = lobbyId;

      console.log(`Player ${socket.id} joined lobby ${lobbyId}`);

      const lobby = lobbies[lobbyId];

      // Send player the current lobby state
      socket.emit("lobbyJoined", {
        lobbyId,
        lobbyName: lobby.name,
        players: lobby.players,
        heightmap: lobby.heightmap,
        heightmapOverlay: lobby.heightmapOverlay,
        gameStarted: lobby.gameStarted
      });

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
  });

  socket.on("leaveLobbyRequest", () => {
    if (currentLobby && lobbies[currentLobby]) {
      lobbies[currentLobby].players = lobbies[currentLobby].players.filter(
        player => player.id !== socket.id
      );

      console.log(`Player ${socket.id} left lobby ${currentLobby}`);

      if (lobbies[currentLobby].host === socket.id) {
        if (lobbies[currentLobby].players.length > 0) {
          const newHost = lobbies[currentLobby].players[0];
          lobbies[currentLobby].host = newHost.id;
          newHost.isHost = true;
          io.to(newHost.id).emit("becameHost");
        } else {
          delete lobbies[currentLobby];
          currentLobby = null;
          return;
        }
      }

      socket.leave(currentLobby);

      if (lobbies[currentLobby]) {
        io.to(currentLobby).emit("lobbyUpdated", {
          players: lobbies[currentLobby].players
        });
      }

      currentLobby = null;
    }
  });

  socket.on("startGame", (data) => {
    const { lobbyId } = data;
    console.log("start game button")
    if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id) {
      console.log("current lobby host")
      lobbies[currentLobby].gameStarted = true;
      io.to(currentLobby).emit("gameStarted");
      console.log("current lobby host")
    }
  });

  socket.on("terrainGenerated", (terrainData) => {
    if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id) {
      lobbies[currentLobby].terrainData = terrainData;
      lobbies[currentLobby].gameStarted = true;

      const gameStartedData = {
        terrainData: terrainData.terrainData
      };

      socket.to(currentLobby).emit("gameStarted", gameStartedData);
      socket.to(currentLobby).emit("terrainDataReceived", gameStartedData);
    }
  });

  socket.on("newBoatPosition", (data) => {
    if (currentLobby) {
      socket.to(currentLobby).emit("enemyBoatMovement", {
        playerId: socket.id,
        ...data
      });
    } else {
      socket.broadcast.emit("enemyBoatMovement", {
        playerId: socket.id,
        ...data
      });
    }
  });

  socket.on("gameAction", (action) => {
    if (currentLobby) {
      socket.to(currentLobby).emit("playerGameAction", {
        playerId: socket.id,
        ...action
      });
    }
  });
  socket.on("debug", () => {
    console.log("debug")
  });

  socket.on("confirmGameStart", (data) => {
    const { lobbyId, socketId } = data;

    if (lobbies[lobbyId]) {
      const existingPlayer = lobbies[lobbyId].players.find(p => p.id === socketId);

      if (!existingPlayer) {
        const wasHost = lobbies[lobbyId].host === socketId;
        const playerIndex = lobbies[lobbyId].players.findIndex(p =>
          p.id !== socketId && p.isHost === wasHost
        );

        if (playerIndex !== -1) {
          lobbies[lobbyId].players[playerIndex].id = socket.id;
          if (wasHost) {
            lobbies[lobbyId].host = socket.id;
          }
        }
      }

      socket.join(lobbyId);
      currentLobby = lobbyId;
    }
  });

socket.on("disconnect", () => {
  console.log(`Player disconnected: ${socket.id}`);

  for (const lobbyId in lobbies) {
    const lobby = lobbies[lobbyId];
    const index = lobby.players.findIndex(p => p.id === socket.id);

    if (index !== -1) {
      const wasHost = lobby.players[index].isHost;

      // Remove player
      lobby.players.splice(index, 1);
      console.log(`Removing disconnected player: ${socket.id} from lobby ${lobbyId}`);

      // 🔄 Promote new host if necessary
      if (wasHost && lobby.players.length > 0) {
        lobby.players[0].isHost = true;
        console.log(`Promoting new host: ${lobby.players[0].id}`);
      }

      // 🧼 Delete empty lobby
      if (lobby.players.length === 0) {
        delete lobbies[lobbyId];
        console.log(`Deleted empty lobby ${lobbyId}`);
      } else {
        // Notify remaining players
        io.to(lobbyId).emit("lobbyUpdated", {
          players: lobby.players
        });
      }

      break;
    }
  }
});

});

