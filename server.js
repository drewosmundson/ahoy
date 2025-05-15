


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





io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Create a new lobby
  socket.on("debug", (data) => {
    console.log(`debug from ${socket.id}:`, data);
  })

  socket.on("newBoatPosition", (data) => {
    console.log(`Boat position from ${socket.id}:`, data);
    // broadcast the new boat position to all other clients
    socket.broadcast.emit("enemyBoatMovement", data);
  })
})






server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
