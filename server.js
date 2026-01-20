


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
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION');
  console.error(reason);
});

// ---- Wrap startup in bootstrap function for error logging ----
function bootstrap() {
  const PORT = process.env.PORT || 3000;

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // const io = new Server(server, {
  // cors: { origin: ['https://ahoy.com'] }});
  server.on('error', (err) => {
    console.error('HTTP SERVER ERROR');
    console.error(err);
    process.exit(1);
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Serve static files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use(express.static(path.join(__dirname, 'public')));

  // Initialize managers
  const lobbyManager = new LobbyManager(io);
  const gameManager = new GameManager(io);


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

