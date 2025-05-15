

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

  let socket = null;
  try {
    socket = io();
  }
  catch (error) {
    console.error('Error initializing socket:', error);
  }
  let game;

  // instant start for debugging
//   const instantStart = true;
//   if(instantStart){
//     homeScreen.style.display = "none";
//     gameCanvas.style.display = "block";
//     singlePlayerMenuScreen.classList.add('hidden');
//     game = new Game(gameCanvas, socket);
//     game.start();
//   }

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
    game = new Game(gameCanvas, socket);
    game.start();
    window.game = game; // for debugging
    });
  /////////////////////////////////////////////////////
  // Multiplayer Menu Events
  /////////////////////////////////////////////////////


    ////////////////////////////////////////////////
    // Create Lobby Menu Events
    /////////////////////////////////////////////////////
    // client -> server
    createLobbyMenuButton?.addEventListener('click', () => {
        mainMenuScreen.classList.add('hidden');
        createLobbyMenuScreen.classList.remove('hidden');
        socket.emit('createLobbyRequest');
    });
    createLobby?.addEventListener('click', () => {

    });


    ////////////////////////////////////////////////////
    // Join Lobby Menu Events
    /////////////////////////////////////////////////////
        // client -> server



    joinLobbyMenuButton?.addEventListener('click', () => {
        mainMenuScreen.classList.add('hidden');
        joinLobbyMenuScreen.classList.remove('hidden');
    });

    joinLobby?.addEventListener('click', () => {
        const lobbyId = lobbyInputNumber.value.trim().toUpperCase();
            if (lobbyId) {
            socket.emit('joinLobbyRequest', { lobbyId, socketId: socket.id });
            }
        });


    ///////////////////////////////////////////
    // game events
    //////////////////////////////////////////
});

