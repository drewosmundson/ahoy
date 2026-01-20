import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
  // ---- Dom Elements ----

  // Main Menu
  const homeScreen = document.getElementById('homeScreen');
  const mainMenuScreen = document.getElementById('mainMenuScreen');
  const singlePlayerMenuButton = document.getElementById('singlePlayerMenuButton');
  const joinLobbyMenuButton = document.getElementById('joinLobbyMenuButton');
  const createLobbyMenuButton = document.getElementById('createLobbyMenuButton');

  // Single Player
  const singlePlayerMenuScreen = document.getElementById('singlePlayerMenuScreen');
  const singlePlayerStartButton = document.getElementById('singlePlayerStartButton');

  // Create Lobby
  const createLobbyScreen = document.getElementById('createLobbyScreen');
  const hostNicknameInput = document.getElementById('hostNickname');
  const createLobbyButton = document.getElementById('createLobbyButton');

  // Join Lobby
  const joinLobbyScreen = document.getElementById('joinLobbyScreen');
  const lobbyCodeInput = document.getElementById('lobbyCode');
  const joinLobbyButton = document.getElementById('joinLobbyButton');

  // Host Lobby
  const hostLobbyScreen = document.getElementById('hostLobbyScreen');
  const hostNicknameDisplay = document.querySelectorAll('#hostNicknameDisplay');
  const lobbyCodeDisplay = document.querySelectorAll('#lobbyCodeDisplay');
  const playerListItems = document.querySelectorAll('#playerListItems');
  const startGameButton = document.getElementById('startGameButton');

  // Participant Lobby
  const participantLobbyScreen = document.getElementById('participantLobbyScreen');

  // Common Lobby Elements
  const leaveLobbyButtons = document.querySelectorAll('#leaveLobbyButton');

  // Game Canvas
  const gameCanvas = document.getElementById('gameCanvas');
  const gameContainer = document.getElementById('gameContainer');

  /////////////////////////////////////////////////////
  // State Variables
  /////////////////////////////////////////////////////

  let socket = null;
  let game;
  let host = true;
  let heightmap = null;
  let heightmapOverlay = null;
  let currentLobbyId = null;
  let multiplayer = false;
  let currentScreen = 'mainMenu'; // Track current screen for navigation

  try {
    socket = io();
  } catch (error) {
    console.error('Error initializing socket:', error);
  }

  /////////////////////////////////////////////////////
  // Navigation System with History API
  /////////////////////////////////////////////////////

  // Navigation state management
  const navigationStates = {
    mainMenu: { screen: 'mainMenu', title: 'Ahoy.io - Main Menu' },
    singlePlayerMenu: { screen: 'singlePlayerMenu', title: 'Ahoy.io - Single Player' },
    createLobby: { screen: 'createLobby', title: 'Ahoy.io - Create Lobby' },
    joinLobby: { screen: 'joinLobby', title: 'Ahoy.io - Join Lobby' },
    hostLobby: { screen: 'hostLobby', title: 'Ahoy.io - Host Lobby', lobbyId: null },
    participantLobby: { screen: 'participantLobby', title: 'Ahoy.io - Participant Lobby', lobbyId: null },
    game: { screen: 'game', title: 'Ahoy.io - Game' }
  };

  function pushNavigationState(stateName, additionalData = {}) {
    const state = { ...navigationStates[stateName], ...additionalData };
    currentScreen = stateName;
    
    // Update browser history
    history.pushState(state, state.title, `#${stateName}`);
    document.title = state.title;
    
    console.log('Pushed navigation state:', stateName, state);
  }

  function navigateToScreen(stateName, additionalData = {}, pushState = true) {
    console.log('Navigating to screen:', stateName);
    
    // Update current screen tracking
    currentScreen = stateName;
    
    // Push to history if requested (default behavior)
    if (pushState) {
      pushNavigationState(stateName, additionalData);
    }
    
    // Hide all screens first
    hideAllScreens();
    
    // Show the appropriate screen
    switch (stateName) {
      case 'mainMenu':
        mainMenuScreen.classList.remove('hidden');
        break;
      case 'singlePlayerMenu':
        singlePlayerMenuScreen.classList.remove('hidden');
        break;
      case 'createLobby':
        createLobbyScreen.classList.remove('hidden');
        break;
      case 'joinLobby':
        joinLobbyScreen.classList.remove('hidden');
        break;
      case 'hostLobby':
        hostLobbyScreen.classList.remove('hidden');
        break;
      case 'participantLobby':
        participantLobbyScreen.classList.remove('hidden');
        break;
      case 'game':
        homeScreen.style.display = 'none';
        gameCanvas.style.display = 'block';
        break;
    }
  }

  // Handle browser back/forward button
  window.addEventListener('popstate', (event) => {
    console.log('Popstate event:', event.state);
    
    if (event.state) {
      const stateName = event.state.screen;
      
      // Handle special cases for lobby screens
      if ((stateName === 'hostLobby' || stateName === 'participantLobby') && !currentLobbyId) {
        // If we're supposed to be in a lobby but don't have a lobby ID, go to main menu
        navigateToScreen('mainMenu', {}, false);
        return;
      }
      
      // Handle game screen
      if (stateName === 'game' && !game) {
        // If we're supposed to be in game but don't have a game instance, go back appropriately
        if (currentLobbyId) {
          navigateToScreen(host ? 'hostLobby' : 'participantLobby', { lobbyId: currentLobbyId }, false);
        } else {
          navigateToScreen('mainMenu', {}, false);
        }
        return;
      }
      
      // Normal navigation
      navigateToScreen(stateName, event.state, false);
    } else {
      // No state means we're at the initial page load
      navigateToScreen('mainMenu', {}, false);
    }
  });

  // Initialize navigation on page load
  function initializeNavigation() {
    // Set initial state
    const initialState = navigationStates.mainMenu;
    history.replaceState(initialState, initialState.title, '#mainMenu');
    document.title = initialState.title;
    currentScreen = 'mainMenu';
  }

  function hideAllScreens() {
    [
      mainMenuScreen,
      singlePlayerMenuScreen,
      createLobbyScreen,
      joinLobbyScreen,
      hostLobbyScreen,
      participantLobbyScreen
    ].forEach(screen => {
      if (screen) screen.classList.add('hidden');
    });
    
    // Also handle game screen visibility
    if (gameCanvas.style.display === 'block') {
      homeScreen.style.display = 'block';
      gameCanvas.style.display = 'none';
    }
  }

  // Enhanced leave lobby function that respects navigation
  function leaveLobbyAndNavigate() {
    if (currentLobbyId) {
      socket.emit('leaveLobbyRequest');
      currentLobbyId = null;
      host = true;
    }
    navigateToScreen('mainMenu');
  }

  /////////////////////////////////////////////////////
  // Game Start
  /////////////////////////////////////////////////////

  // Single Player
  singlePlayerMenuButton?.addEventListener('click', () => {
    navigateToScreen('singlePlayerMenu');
  });

  singlePlayerStartButton?.addEventListener('click', () => {
    startGameForSinglePlayer();
  });

  function startGameForSinglePlayer() {
    multiplayer = false;
    navigateToScreen('game');

    game = new Game(gameCanvas, socket, multiplayer, heightmap, heightmapOverlay);
    game.start();
    window.game = game; // For debugging
  }

  /////////////////////////////////////////////////////
  // Menu Event Handlers
  /////////////////////////////////////////////////////

  // Create Lobby
  createLobbyMenuButton?.addEventListener('click', () => {
    navigateToScreen('createLobby');
  });

  createLobbyButton?.addEventListener('click', () => {
    const hostNickname = hostNicknameInput.value.trim();
    socket.emit('createLobbyRequest', { hostNickname, socketId: socket.id });
  });

  // Join Lobby
  joinLobbyMenuButton?.addEventListener('click', () => {
    navigateToScreen('joinLobby');
  });

  joinLobbyButton?.addEventListener('click', () => {
    const lobbyCode = lobbyCodeInput.value.trim().toUpperCase();
    if (lobbyCode) {
      socket.emit('joinLobbyRequest', { lobbyId: lobbyCode, socketId: socket.id });
    }
  });

  /////////////////////////////////////////////////////
  // Lobby Updates from Server
  /////////////////////////////////////////////////////

  socket.on('lobbyCreated', (data) => {
    currentLobbyId = data.lobbyId;
    host = true;

    heightmap = data.heightmap;
    heightmapOverlay = data.heightmapOverlay;

    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });

    updatePlayerList(data.players);
    
    // Navigate to host lobby screen
    navigateToScreen('hostLobby', { lobbyId: data.lobbyId });
  });

  socket.on('lobbyJoined', (data) => {
    currentLobbyId = data.lobbyId;
    host = false;

    heightmap = data.heightmap;
    heightmapOverlay = data.heightmapOverlay;

    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });

    updatePlayerList(data.players);

    if (data.terrainData) {
      terrainData = data.terrainData;
      if (data.gameStarted) {
        setTimeout(startGameForPlayer, 100);
      }
    }
    
    // Navigate to participant lobby screen
    navigateToScreen('participantLobby', { lobbyId: data.lobbyId });
  });

  socket.on('lobbyUpdated', (data) => {
    updatePlayerList(data.players);
  });

  socket.on('gameStarted', (data) => {
    multiplayer = true;
    
    if(heightmap == null){
      socket.emit("debug");
    }

    navigateToScreen('game');
    
    game = new Game(gameCanvas, socket, multiplayer, heightmap, heightmapOverlay);
    game.start();
    window.game = game;
  });

  socket.on('terrainDataReceived', (data) => {
    console.log('Received terrain data from host (legacy event)');
    terrainData = data.terrainData;
  });

  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message);
    
    // On error, navigate back to main menu
    navigateToScreen('mainMenu');
  });

  /////////////////////////////////////////////////////
  // Lobby Actions
  /////////////////////////////////////////////////////

  function updatePlayerList(players) {
    playerListItems.forEach(el => {
      if (el) {
        el.innerHTML = '';
        players.forEach(player => {
          const li = document.createElement('li');
          li.textContent = player.name || player.id;
          if (player.isHost) li.textContent += ' (Host)';
          el.appendChild(li);
        });
      }
    });
  }

  leaveLobbyButtons.forEach(button => {
    button?.addEventListener('click', () => {
      leaveLobbyAndNavigate();
    });
  });

  startGameButton?.addEventListener('click', () => {
    if (host && currentLobbyId) {
      socket.emit('startGame', { lobbyId: currentLobbyId });
    }
  });

  // Handle socket disconnection - navigate to main menu
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    currentLobbyId = null;
    host = true;
    navigateToScreen('mainMenu');
  });

  // Initialize navigation system
  initializeNavigation();
});