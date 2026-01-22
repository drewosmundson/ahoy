


// ==== lobby.events.js ====

// ---- Client -> Server ----
export const ClientEvents = {
  CREATE_LOBBY: 'lobby:create',
  JOIN_LOBBY: 'lobby:join',
  LEAVE_LOBBY: 'lobby:leave',
  START_GAME: 'lobby:start',
  TERRAIN_READY: 'lobby:terrain_ready',
} 

// ---- Server -> Client ----
export const ServerEvents = {
  LOBBY_CREATED: 'lobby:created',
  LOBBY_JOINED: 'lobby:joined',
  LOBBY_UPDATED: 'lobby:updated',
  GAME_STARTED: 'game:started',
  ERROR: 'lobby:error',
  HOST_TRANSFERRED: 'lobby:host_transferred',
}


// current implmentation

// export const ClientLobbyEvents = {
//   CREATE_LOBBY_REQUEST: 'createLobbyRequest',
//   JOIN_LOBBY_REQUEST: 'joinLobbyRequest',
//   LEAVE_LOBBY_REQUEST: 'leaveLobbyRequest',
//   START_GAME: 'startGame',
//   DEBUG: 'debug',
// }


// export const ServerLobbyEvents = {
//   LOBBY_CREATED: 'lobbyCreated',
//   LOBBY_JOINED: 'lobbyJoined',
//   LOBBY_UPDATED: 'lobbyUpdated',
//   GAME_STARTED: 'gameStarted',
//   TERRAIN_DATA_RECEIVED: 'terrainDataReceived',
//   ERROR: 'error',
// }