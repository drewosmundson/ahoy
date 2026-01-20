export const ClientEvents = {
  CREATE_LOBBY: 'lobby:create',
  JOIN_LOBBY: 'lobby:join',
  LEAVE_LOBBY: 'lobby:leave',
  START_GAME: 'lobby:start',
  TERRAIN_READY: 'lobby:terrain_ready',
} 

// Server → Client
export const ServerEvents = {
  LOBBY_CREATED: 'lobby:created',
  LOBBY_JOINED: 'lobby:joined',
  LOBBY_UPDATED: 'lobby:updated',
  GAME_STARTED: 'game:started',
  ERROR: 'lobby:error',
  HOST_TRANSFERRED: 'lobby:host_transferred',
} 