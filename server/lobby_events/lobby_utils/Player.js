



export class Player {
  constructor(socketId) {
        this.socketId = socketId,
        this.name = `Player ${socketId.substr(0, 4)}`
        this.isHost = true;
        this.currenthealth = 100;
        this.maxHealth = 100;
        this.alive = true;
  }
}
  