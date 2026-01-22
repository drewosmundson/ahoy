
// TODO Fix these to follow grep standards


// ==== game.events.js ====

// ---- Client -> Server ----
export const ClientGameEvents = {
  PLAYER_UPDATE: 'playerUpdate',
  PROJECTILE_FIRED: 'projectileFired',
  BOAT_HIT: 'boatHit',
  BOAT_DESTROYED: 'boatDestroyed',
  PLAYER_RESPAWNED: 'playerRespawned',
  DEBUG: 'debug',
}

// ---- Server -> Client ----
export const ServerGameEvents = {
  PLAYER_UPDATE: 'playerUpdate',              // enemy boat movement
  ENEMY_PROJECTILE_FIRED: 'enemyProjectileFired',
  BOAT_HIT: 'boatHit',
  BOAT_DESTROYED: 'boatDestroyed',
  DEBUG_INFO: 'debugInfo',
}
