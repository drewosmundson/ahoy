



class Lobby {
  constructor ({id, hostId, heightmap, heightmapOverlay}) {
    this.id = id;
    this.hostId = hostId,
    this.heightmap = heightmap;
    this.heightmapOverlay = heightmapOverlay;
    
    this.players = new Map();
    this.gameStarted = false;
    this.terrainData = null;
  }


  addPlayer(player) {
    if (this.gameStarted){throw new Error("game already started") // change later to allow players to join later.
    }
    // ensure the same player isnt added twice
    if (this.players.has(player.id)) {
      return;
    }
    this.players.set(player.id, player);
  }

  removePlayer(player) {
    this.players.delete(socketId);

    //if (this.players.size === 0) {
    //   return 'EMPTY';
    // }

    // if (socketId === this.hostId) {
    //   const [nextHost] = this.players.values();
    //   nextHost.isHost = true;
    //   this.hostId = nextHost.id;
    // }

    // return 'OK';
  }
  startGame(bySocketId) {
    if (bySocketId !== this.hostId) {
      throw new Error('Only host can start');
    }
    if (this.gameStarted) return;
    this.gameStarted = true;
  }


  setTerrain(bySocketId, terrainData) {
    if (bySocketId !== this.hostId) {
      throw new Error('Only host can set terrain');
    }
    if (!this.gameStarted) {
      throw new Error('Game not started');
    }
    this.terrainData = terrainData;
  }

  snapshot() {
    return {
      id: this.id,
      hostId: this.hostId,
      gameStarted: this.gameStarted,
      players: Array.from(this.players.values()),
      heightmap: this.heightmap,
      heightmapOverlay: this.heightmapOverlay
    };
  }
}
