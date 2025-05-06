
import { ThreeJsScene } from './threeJsScene.js';

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

  game = new ThreeJsScene(gameCanvas);
  game.start();
});


