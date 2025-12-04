// Drew Osmundson
// drewosmundson.github.io




// bundler build with Vite 







// server.js
// This is the entry point for this program

// Naming scheme for event handling:
// events sent from the server are in past tense
// events sent from a client are in present tense
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { LobbyManager } from './server_events/MultiplayerLobbyEvents.js';
import { GameManager } from './server_events/MultiplayerGameEvents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize managers
const lobbyManager = new LobbyManager(); 
const gameManager = new GameManager();
//create premade heightmaps
// const numberOfPremadeMaps = 10;
// for(number in numberOfPremadeMaps ) {}
  
// Handle socket connections
// if the user selects a multiplayer option handle lobby connection.
io.on("connection", (socket) => {

  socket.on("connectToLobby", () => {
    lobbyManager.handleConnection(socket);
  });

  socket.on("disconnectFromLobby", () => {
    lobbyManager.handleDisconnection(socket);
  });

  socket.on("connectToGame", () => {
    gameManager.handleConnection(socket);
  });

  socket.on("disconnectFromGame", () => {
    gameManager.handleDisconnection(socket);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});