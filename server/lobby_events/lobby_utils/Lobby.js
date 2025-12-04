

    // TODO combine these tree lines into two and make noise generator and Heightmap Generator one Class
    const heightmapGenerator = new HeightmapGenerator();
    const heightmap = heightmapGenerator.heightmap;
    const heightmapOverlay = heightmapGenerator.heightmapOverlay;  


export class Lobby {
  constructor(lobbyCode) {
        this.lobbyName = `Lobby ${lobbyCode}`;
        this.socketId = socketId,
        this.name = `Player ${socketId.substr(0, 4)}`
        this.isHost = true;
        this.currenthealth = 100;
        this.maxHealth = 100;
        this.alive = true;

      id: lobbyCode,
      host: socket.id,
      heightmap: heightmap,
      heightmapOverlay: heightmapOverlay,
      gameStarted: false,
      // players: [newPlayer],
      players: [socketId] = newPlayer,
  }
}
  