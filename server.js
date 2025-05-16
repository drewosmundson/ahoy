const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // You may need to install this: npm install uuid

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

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
      // Check if game already started
      if (lobbies[lobbyId].gameStarted) {
        socket.emit("error", { message: "Game already in progress" });
        return;
      }
      
      // Add player to the lobby
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
        players: lobbies[lobbyId].players
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
  
  // Update Lobby Settings (host only)
  socket.on("updateLobbySettings", (settings) => {
    if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id) {
      lobbies[currentLobby].settings = {
        ...lobbies[currentLobby].settings,
        ...settings
      };
      
      // Notify all players about the settings update
      io.to(currentLobby).emit("lobbySettingsUpdated", {
        settings: lobbies[currentLobby].settings
      });
    }
  });
  
  // Chat Messages
  socket.on("sendChatMessage", (message) => {
    if (currentLobby && lobbies[currentLobby]) {
      const playerName = lobbies[currentLobby].players.find(
        p => p.id === socket.id
      )?.name || `Player ${socket.id.substr(0, 4)}`;
      
      const chatMessage = {
        id: uuidv4(),
        playerId: socket.id,
        playerName: playerName,
        message: message,
        timestamp: Date.now()
      };
      
      // Store in lobby (limited history)
      lobbies[currentLobby].chatMessages.push(chatMessage);
      if (lobbies[currentLobby].chatMessages.length > 50) {
        lobbies[currentLobby].chatMessages.shift(); // Keep only the last 50 messages
      }
      
      // Broadcast to all players in the lobby
      io.to(currentLobby).emit("chatMessageReceived", chatMessage);
    }
  });
  
  // Start Game Request (host only)
  socket.on("startGameRequest", () => {
    if (currentLobby && lobbies[currentLobby] && lobbies[currentLobby].host === socket.id) {
      lobbies[currentLobby].gameStarted = true;
      
      console.log(`Game started in lobby ${currentLobby}`);
      
      // Notify all players that the game is starting
      io.to(currentLobby).emit("gameStarted", {
        settings: lobbies[currentLobby].settings,
        players: lobbies[currentLobby].players
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