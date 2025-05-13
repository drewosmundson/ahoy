

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js';
import { Game } from './Game.js';


document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const homeScreen = document.getElementById('homeScreen');
  const mainMenuScreen = document.getElementById('mainMenuScreen');
  const singlePlayerMenuButton = document.getElementById('singlePlayerMenuButton');
  const joinLobbyMenuButton = document.getElementById('joinLobbyMenuButton');
  const createLobbyMenuButton = document.getElementById('createLobbyMenuButton');

  const singlePlayerMenuScreen = document.getElementById('singlePlayerMenuScreen');
  const singlePlayerStartButton = document.getElementById('singlePlayerStartButton');

  const gameCanvas = document.getElementById('gameCanvas');
  let game;

  // instant start for debugging
  const instantStart = true;
  if(instantStart){
    homeScreen.style.display = "none";
    gameCanvas.style.display = "block";
    singlePlayerMenuScreen.classList.add('hidden');
    game = new Game(gameCanvas);
    game.start();
  }

  /////////////////////////////////////////////////////
  // Single Player Menu Events
  /////////////////////////////////////////////////////
  singlePlayerMenuButton?.addEventListener('click', () => {
    mainMenuScreen.classList.add('hidden');
    singlePlayerMenuScreen.classList.remove('hidden');
  });

  singlePlayerStartButton?.addEventListener('click', () => {
    homeScreen.style.display = "none";
    gameCanvas.style.display = "block";
    singlePlayerMenuScreen.classList.add('hidden');
    game = new Game(gameCanvas);
    game.start();

    window.game = game; // for debugging
    });
  });
  /////////////////////////////////////////////////////
  // Multiplayer Menu Events
  /////////////////////////////////////////////////////

  let socket = null;

  try {

      socket = io();

      socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          errorMessage.textContent = 'Connection error. Please try again later.';
      });

      socket.on('disconnect', (reason) => {
          console.warn('Socket disconnected:', reason);
      });

  } catch (err) {
      console.error('Socket initialization failed:', err);
      errorMessage.textContent = 'Failed to initialize connection.';
  }

  if (socket) {
      socket.emit("debug");
      /////////////////////////////////////////////////////
      // Create Lobby Menu Events
      /////////////////////////////////////////////////////
      // client -> server
      createLobby?.addEventListener('click', () => {
          socket.emit("debug");
      });

      createLobbyButton?.addEventListener('click', () => {
          socket.emit('create-lobby');
      });

      // server -> client
      socket.on('lobby-created', ({ lobbyId }) => {
          friendsMenuScreen.classList.add('hidden');
          lobbyMenuScreen.classList.remove('hidden');
          lobbyDisplayNumber.textContent = lobbyId;
      });

      socket.on('lobby-joined', ({ lobbyId }) => {
          friendsMenuScreen.classList.add('hidden');
          lobbyMenuScreen.classList.remove('hidden');
          lobbyDisplayNumber.textContent = lobbyId;
      });

      /////////////////////////////////////////////////////
      // Join Lobby Menu Events
      /////////////////////////////////////////////////////
          // client -> server

      joinLobby?.addEventListener('click', () => {
          socket.emit("debug");
      });

      joinLobbyButton?.addEventListener('click', () => {
          const lobbyId = lobbyInputNumber.value.trim().toUpperCase();
          if (lobbyId) {
          socket.emit('join-lobby', { lobbyId, playerNum: 2 });
          }
      });

          // server -> client
      socket.on('join-error', ({ message }) => {
          errorMessage.textContent = message;
      });


      ///////////////////////////////////////////
      // game events
      //////////////////////////////////////////







  }