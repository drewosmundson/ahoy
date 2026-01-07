export class Player {
  constructor({ id, name, isHost = false }) {
    this.id = id;
    this.name = name || `Player ${id.substr(0, 4)}`;
    this.isHost = isHost;
    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
  }

  makeHost() {
    this.isHost = true;
  }

  removeHost() {
    this.isHost = false;
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      health: this.health,
      maxHealth: this.maxHealth,
      alive: this.alive
    };
  }
}