// entry point for the Socket.IO server

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // You may need to install this: npm install uuid

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Lobby structure with more details
const lobbies = {};

// Helper function to generate a 6-character alphanumeric lobby code
function generateLobbyCode() {
  // Create a short, easy to type code (letters and numbers)
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  let currentLobby = null; // Track which lobby this socket is in
  
  //////////////////////////////////////
  // Debug Utils
  /////////////////////////////////////
  socket.on("debug", (data) => {
    console.log(`Debug from ${socket.id}:`, data);
  });

  ///////////////////////////
  // Lobby Management
  ////////////////////////////
  
  // Create Lobby Request
  socket.on("createLobbyRequest", (data) => {
    const lobbyCode = generateLobbyCode();
    const lobbyName = data?.lobbyName || `Lobby ${lobbyCode}`;
    
    // Create the lobby object
    lobbies[lobbyCode] = {
      id: lobbyCode,
      name: lobbyName,
      host: socket.id,
      terrainData: null, // Placeholder for terrain data
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
      chatMessages: [],
    };
    
    // Join the socket to the room
    socket.join(lobbyCode);
    currentLobby = lobbyCode;
    
    console.log(`Lobby created: ${lobbyCode} by ${socket.id}`);
    
    // Notify the client
    socket.emit("lobbyCreated", {
      lobbyId: lobbyCode,
      lobbyName: lobbyName,
      players: lobbies[lobbyCode].players
    });
  });

  // Join Lobby Request
  socket.on("joinLobbyRequest", (data) => {
    const { lobbyId } = data;
    
    if (lobbies[lobbyId]) {
      // Add player to the lobby (even if game started - they can join in progress)
      const playerData = {
        id: socket.id,
        name: `Player ${socket.id.substr(0, 4)}`,
        isHost: false
      };
      
      lobbies[lobbyId].players.push(playerData);
      
      // Join the socket to the room
      socket.join(lobbyId);
      currentLobby = lobbyId;
      
      console.log(`Player ${socket.id} joined lobby ${lobbyId}`);
      
      // Notify the client that joined
      socket.emit("lobbyJoined", {
        lobbyId: lobbyId,
        lobbyName: lobbies[lobbyId].name,
        players: lobbies[lobbyId].players,
        terrainData: lobbies[lobbyId].terrainData,
        gameStarted: lobbies[lobbyId].gameStarted
      });
      
      // Notify other players in the lobby
      socket.to(lobbyId).emit("lobbyUpdated", {
        players: lobbies[lobbyId].players
      });
    } else {
      socket.emit("error", { message: "Lobby not found" });
    }
  });
  
  // Leave Lobby Request
  socket.on("leaveLobbyRequest", () => {
    if (currentLobby && lobbies[currentLobby]) {
      // Remove player from the lobby
      lobbies[currentLobby].players = lobbies[currentLobby].players.filter(
        player => player.id !== socket.id
      );
      
      console.log(`Player ${socket.id} left lobby ${currentLobby}`);
      
      // If the host left, assign a new host or delete the lobby
      if (lobbies[currentLobby].host === socket.id) {
        if (lobbies[currentLobby].players.length > 0) {
          // Assign the first remaining player as the new host
          const newHost = lobbies[currentLobby].players[0];
          lobbies[currentLobby].host = newHost.id;
          newHost.isHost = true;
          
          // Notify the new host
          io.to(newHost.id).emit("becameHost");
        } else {
          // Delete the lobby if no players left
          delete lobbies[currentLobby];
          currentLobby = null;
          return;
        }
      }
      
      // Leave the socket room
      socket.leave(currentLobby);
      
      // Notify remaining players
      if (lobbies[currentLobby]) {
        io.to(currentLobby).emit("lobbyUpdated", {
          players: lobbies[currentLobby].players
        });
      }
      
      currentLobby = null;
    }
  });

  // NEW: Handle game start request from host
  socket.on("startGame", (data) => {
    console.log('=== START GAME REQUEST RECEIVED ===');
    console.log('Request data:', data);
    console.log('Socket info:', {
      socketId: socket.id,
      currentLobby: currentLobby
    });
    
    const { lobbyId } = data;
    
    if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id) {
      console.log('✅ Valid start game request');
      console.log('Lobby state before start:', {
        lobbyId: currentLobby,
        host: lobbies[currentLobby].host,
        playerCount: lobbies[currentLobby].players.length,
        gameStarted: lobbies[currentLobby].gameStarted,
        terrainData: lobbies[currentLobby].terrainData ? 'present' : 'null'
      });
      
      console.log(`🎮 Game starting for lobby ${currentLobby}`);
      
      // Mark game as started
      lobbies[currentLobby].gameStarted = true;
      console.log('✅ Lobby marked as game started');
      
      // The host will generate terrain and send it via terrainGenerated event
      // We don't start the game for other players here, we wait for terrain data
      console.log('⏳ Waiting for terrain generation from host...');
    } else {
      console.log('❌ Invalid start game request:', {
        hasCurrentLobby: !!currentLobby,
        lobbyExists: !!(currentLobby && lobbies[currentLobby]),
        isHost: !!(currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id),
        actualHost: currentLobby && lobbies[currentLobby] ? lobbies[currentLobby].host : 'N/A'
      });
    }
  });

  // Terrain generation handler - IMPROVED VERSION
  socket.on("terrainGenerated", (terrainData) => {
    console.log('=== TERRAIN GENERATED EVENT RECEIVED ===');
    console.log('Terrain data info:', {
      socketId: socket.id,
      currentLobby: currentLobby,
      terrainDataSize: terrainData ? Object.keys(terrainData).length : 0,
      hasTerrainData: !!terrainData?.terrainData
    });
    
    if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id) {
      console.log('✅ Valid terrain generation from host');
      
      // Store the terrain data in the lobby object
      lobbies[currentLobby].terrainData = terrainData;
      console.log('💾 Terrain data stored in lobby');
      
      // Mark game as officially started now that terrain is ready
      lobbies[currentLobby].gameStarted = true;
      console.log('✅ Game officially started');
      
      console.log(`📤 Sending gameStarted event to all players in lobby ${currentLobby}`);
      console.log('Players in lobby:', lobbies[currentLobby].players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
      })));
      
      // Notify ALL players in the lobby (except host) that the game has started with terrain data
      const gameStartedData = {
        terrainData: terrainData.terrainData // Match the structure expected by client
      };
      
      console.log('Game started data being sent:', {
        hasTerrainData: !!gameStartedData.terrainData,
        terrainDataKeys: gameStartedData.terrainData ? Object.keys(gameStartedData.terrainData) : []
      });
      
      socket.to(currentLobby).emit("gameStarted", gameStartedData);
      console.log('✅ gameStarted event sent to lobby members');
      
      // Also send the legacy event for backward compatibility
      socket.to(currentLobby).emit("terrainDataReceived", {
        terrainData: terrainData.terrainData
      });
      console.log('✅ terrainDataReceived event sent (legacy)');
    } else {
      console.log('❌ Invalid terrain generation:', {
        hasCurrentLobby: !!currentLobby,
        lobbyExists: !!(currentLobby && lobbies[currentLobby]),
        isHost: !!(currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id),
        actualHost: currentLobby && lobbies[currentLobby] ? lobbies[currentLobby].host : 'N/A'
      });
    }
  });

  ////////////////////////////////////
  // In-Game Interactions
  ///////////////////////////////////
  
  socket.on("newBoatPosition", (data) => {
    if (currentLobby) {
      // Send to all other players in the same lobby
      socket.to(currentLobby).emit("enemyBoatMovement", {
        playerId: socket.id,
        ...data
      });
    } else {
      // Fallback for single player or debugging
      socket.broadcast.emit("enemyBoatMovement", {
        playerId: socket.id,
        ...data
      });
    }
  });
  
  socket.on("gameAction", (action) => {
    if (currentLobby) {
      // Forward game actions to other players in the same lobby
      socket.to(currentLobby).emit("playerGameAction", {
        playerId: socket.id,
        ...action
      });
    }
  });
  
  ////////////////////////////////////
  // Disconnection Handling
  ///////////////////////////////////
  
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Handle player leaving any lobby they were in
    if (currentLobby && lobbies[currentLobby]) {
      // Remove player from the lobby
      lobbies[currentLobby].players = lobbies[currentLobby].players.filter(
        player => player.id !== socket.id
      );
      
      // If the host disconnected, assign a new host or delete the lobby
      if (lobbies[currentLobby].host === socket.id) {
        if (lobbies[currentLobby].players.length > 0) {
          // Assign the first remaining player as the new host
          const newHost = lobbies[currentLobby].players[0];
          lobbies[currentLobby].host = newHost.id;
          newHost.isHost = true;
          
          // Notify the new host
          io.to(newHost.id).emit("becameHost");
        } else {
          // Delete the lobby if no players left
          delete lobbies[currentLobby];
          return;
        }
      }
      
      // Notify remaining players
      if (lobbies[currentLobby]) {
        io.to(currentLobby).emit("lobbyUpdated", {
          players: lobbies[currentLobby].players
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});