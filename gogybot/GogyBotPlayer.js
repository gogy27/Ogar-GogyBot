var PlayerTracker = require('../../PlayerTracker');
var gameServer = require('../../GameServer');
var Vector = require('../../modules/Vector');
var Cell = require('../../entity/Cell');

function GogyBotPlayer() {
    PlayerTracker.apply(this, Array.prototype.slice.call(arguments));

    this.splitCooldown = 0;
}

module.exports = GogyBotPlayer;
GogyBotPlayer.prototype = new PlayerTracker();

Object.defineProperty( GogyBotPlayer, "FOOD_INFLUENCE_ON_STEERING", {
	value: 1,
	writable: false,
	enumerable: true,
	configurable: true
});

Object.defineProperty( GogyBotPlayer, "VIRUS_INFLUENCE_ON_STEERING", {
	value: 2,
	writable: false,
	enumerable: true,
	configurable: true
});

Object.defineProperty( GogyBotPlayer, "ENEMY_INFLUENCE_ON_STEERING", {
	value: 3,
	writable: false,
	enumerable: true,
	configurable: true
});

GogyBotPlayer.prototype.update = function() { // Overrides the update function from player tracker
    // Remove nodes from visible nodes if possible
    for (var i = 0; i < this.nodeDestroyQueue.length; i++) {
        var index = this.visibleNodes.indexOf(this.nodeDestroyQueue[i]);
        if (index > -1) {
            this.visibleNodes.splice(index, 1);
        }
    }

    // Respawn if bot is dead
    if (this.cells.length <= 0) {
        this.gameServer.gameMode.onPlayerSpawn(this.gameServer, this);
        if (this.cells.length == 0) {
            // If the bot cannot spawn any cells, then disconnect it
            this.socket.close();
            return;
        }
    }

    if (this.splitCooldown > 0) this.splitCooldown--;


    // Calculate nodes -> LIMITED ability to perceive its environment
    this.visibleNodes = this.viewReset();

    // if we have the cells to calculate on steering behavior
    if (this.cells.length > 0) {
        // Action
        this.action(); // this function should apply force for "imaginary" mouse cursor by calculation steering behavior
    }

    // Reset queues
    this.nodeDestroyQueue = [];
    this.nodeAdditionQueue = [];
};

GogyBotPlayer.prototype.action = function() {
	var me = this.cells[0];
    if (!me) return;

    var force = new Vector(0, 0),
		result = new Vector(0, 0);

    // Get nearest enemy as a target for steering behavior
	var nearestEnemies = this.getNearestEnemies(me, 10);

	if (!nearestEnemies.length) {
		// The default behavior is wandering
		force = this.wander(me.position);
	} else {
		for (var i = 0; i < nearestEnemies.length; i++) {
			switch (nearestEnemies[i].cellType) {
				// If enemy is a food, let's seek it
				case Cell.CELL_TYPE_FOOD:
					var steeringForce = this.seek(me.position, nearestEnemies[i].position);
					steeringForce.scale(GogyBotPlayer.FOOD_INFLUENCE_ON_STEERING / me.position.distanceTo(nearestEnemies[i].position)); // The farther it is the smaller influnce it makes
					force.add(steeringForce);
					break;
				// If v cell is a virus get outta here.
				case Cell.CELL_TYPE_VIRUS:
					var steeringForce = this.flee(me.position, nearestEnemies[i].position);
					steeringForce.scale(GogyBotPlayer.VIRUS_INFLUENCE_ON_STEERING / me.position.distanceTo(nearestEnemies[i].position)); // The farther it is the smaller influnce it makes
					force.add(steeringForce);
					break;
				// If enemy is a player, let's have a look who can eat whom.
				case Cell.CELL_TYPE_PLAYER_CELL:
					// if I can eat him, lets seek him, but the proper way should be pursuit
					if (this.gameServer.collisionHandler.canEat(me, nearestEnemies[i])) {
						var steeringForce = this.seek(me.position, nearestEnemies[i].position);
						steeringForce.scale(GogyBotPlayer.ENEMY_INFLUENCE_ON_STEERING / me.position.distanceTo(nearestEnemies[i].position)); // The farther it is the smaller influnce it makes
						force.add(steeringForce);
					}
					// but if he can eat me, let's flee out from him, but the proper way should be evasion
					else if(this.gameServer.collisionHandler.canEat(nearestEnemies[i], me)) {
						var steeringForce = this.flee(me.position, nearestEnemies[i].position);
						steeringForce.scale(GogyBotPlayer.ENEMY_INFLUENCE_ON_STEERING / me.position.distanceTo(nearestEnemies[i].position)); // The farther it is the smaller influnce it makes
						force.add(steeringForce);
					}
					break;
			}
		}
	}

    result.add(force);
    // Normalize the resulting vector
    result.normalize();
    this.mouse = new Vector(
		me.position.x + result.x * 800,
		me.position.y + result.y * 800
    );
};

// Steering functions

GogyBotPlayer.prototype.seek = function (myPosition, cellPosition) {
    var desired = cellPosition.clone().sub(myPosition);

    return desired.normalize();
};

GogyBotPlayer.prototype.flee = function (myPosition, cellPosition) {
	var desired = cellPosition.clone().sub(myPosition);

	return desired.negate().normalize();
};

GogyBotPlayer.prototype.wander = function (cellPosition) {
	return cellPosition.clone().add(Math.random() - 0.5, Math.random() - 0.5).normalize();
};

// Subfunctions

GogyBotPlayer.prototype.getNearestEnemies = function(me, limit){
	limit = limit || this.visibleNodes.length;

	var nearestEnemies = [];

	this.visibleNodes.sort(function(cell1, cell2){
		return me.position.distanceTo(cell1.position) - me.position.distanceTo(cell2.position);
	});

	var i =0;
	while ((nearestEnemies.length < limit) && (i < this.visibleNodes.length)) {
		if (me.owner != this.visibleNodes[i].owner) {
			nearestEnemies.push(this.visibleNodes[i]);
		}
		i++;
	}

	return nearestEnemies;
};