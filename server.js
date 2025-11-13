import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { LobbyManager } from './server_managers/LobbyManager.js';
import { GameManager } from './server_managers/GameEventManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize managers
const lobbyManager = new LobbyManager(io);
const gameManager = new GameManager(io);

//create premade heightmaps
// const numberOfPremadeMaps = 10;

// for(number in numberOfPremadeMaps ) {
  
// 
// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Initialize handlers for this socket
  lobbyManager.handleConnection(socket);
  gameManager.handleConnection(socket);
  
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    lobbyManager.handleDisconnection(socket);
    gameManager.handleDisconnection(socket);
  });
});