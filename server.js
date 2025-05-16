


const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

let lobbies = {};



io.on("connection", (socket) => {

  //////////////////////////////////////
  // Utils
  /////////////////////////////////////

  console.log(`Player connected: ${socket.id}`);
  // Create a new lobby
  socket.on("debug", (data) => {
    console.log(`debug from ${socket.id}:`, data);
  })


  ///////////////////////////
  // Lobby Menus
  ////////////////////////////


  socket.on("create-lobby", (data) => {
    console.log(`Lobby created by ${socket.id}:`, data);
    const lobbyId = socket.id;
    lobbies[lobbyId] = {
      players: [],
      gameStarted: false,
      gameData: {}
    };
    socket.join(lobbyId);
    socket.emit("lobby-created", { lobbyId });
  });

  socket.on("join-lobby", (lobbyId) => {
    console.log(`Player ${socket.id} joined lobby ${lobbyId}`);
    if (lobbies[lobbyId]) {
      lobbies[lobbyId].players.push(socket.id);
      socket.join(lobbyId);
      socket.emit("lobby-joined", { lobbyId, players: lobbies[lobbyId].players });
      socket.to(lobbyId).emit("player-joined", { playerId: socket.id });
    }
  });

  socket.on("start-game", (lobbyId) => {
    console.log(`Game started in lobby ${lobbyId}`);
    if (lobbies[lobbyId]) {
      lobbies[lobbyId].gameStarted = true;
      socket.to(lobbyId).emit("game-started");
    }
  });


  ////////////////////////////////////
  // Game interactions
  ///////////////////////////////////


  socket.on("newBoatPosition", (data) => {
    console.log(`Boat position from ${socket.id}:`, data);
    // broadcast the new boat position to all other clients
    socket.broadcast.emit("enemyBoatMovement", data);
  })
})


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
