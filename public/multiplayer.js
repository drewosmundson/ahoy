
// for multiplayer
(async () => {
    try {
      const { io } = await import('socket.io-client');
    } catch (e) {
      console.error('Failed to import socket.io-client:', e);
    }
  })();

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
}