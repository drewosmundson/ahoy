





// ---- Imports ----
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { LobbyManager } from './server_managers/LobbyManager.js';
import { GameManager } from './server_managers/GameManager.js';


// ---- process-level safety nets ----
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION');
  console.error(err);
  //process.exit(1) // for a hard crash
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION');
  console.error(reason);
});

// ---- Wrap one time startup in bootstrap function ----

function bootstrap() {

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
}

// ---- Start server ----
try {
  bootstrap();
} catch (err) {
  console.error('FAILED TO BOOTSTRAP SERVER');
  console.error(err);
  process.exit(1);
}