// Project imports
var GogyBotPlayer = require('./GogyBotPlayer');
var FakeSocket = require('../../ai/FakeSocket');
var PacketHandler = require('../../PacketHandler');

function GogyBotLoader(gameServer) {
    this.gameServer = gameServer;
    this.pluginHandler = gameServer.pluginHandler;

    this.name = "Gogy Bot";                             // Name of the plugin.
    this.description = "A plugin with new bots AI.";    // Information about the plugin.
    this.author = 'Jan "Gogy" Vodila';                  // Author of the plugin.
    this.version = "0.0.1";                             // Version of the plugin.

    this.nameIndex = 0;                                 // ID (name suffix) for the new bot (also count of the bots of this instance)

    this.loadNames();
}

module.exports = GogyBotLoader;

GogyBotLoader.prototype.start = function() {
    // Called when the server starts (after gamemode init).
    var self = this;
    // For example, you can add commands:
    this.gameServer.pluginHandler.addCommand(
        'addgogybot', // The command name.
        function(gameServer, split) {           // What the command does. The function must have two arguments: gameServer and split.
            var n = parseInt(split[1]);
            if (isNaN(n)) {
                n = 1; // Adds 1 bot if user doesn't specify a number
            }
            for (var i = 0; i < n; i++) {
                setTimeout(self.addBot.bind(self), i);
            }
            console.log("[GogyBot] Added " + n + " Gogy's bot(s)");
        }.bind(this),                           // You can add .bind(this) to use plugin-specific variables you added.
        "Adding a number of GogyBots",          // Optional - command description.
        "[n]"                                   // Optional - command's accepted variables.
    );

    // You can signal that it's loaded:
    console.log("[GogyBot] Plugin loaded!");
};

GogyBotLoader.prototype.onServerStart = function() {
    // Add starting bots
    if (this.gameServer.config.serverGogyBots > 0) {
        for (var i = 0; i < this.gameServer.config.serverGogyBots; i++) {
            this.addBot();
        }
        console.log("[GogyBot] Loaded " + this.gameServer.config.serverGogyBots + " player bots");
    }
}

GogyBotLoader.prototype.getName = function() {
    // Picks a random name for the bot
    if (this.randomNames.length > 0) {
        var index = Math.floor(Math.random() * this.randomNames.length);
        name = this.randomNames[index];
        this.randomNames.splice(index, 1);
    } else {
        name = "GogyBot - #" + ++this.nameIndex;
    }

    return name;
};

GogyBotLoader.prototype.loadNames = function() {
    this.randomNames = [];

    // Load names
    try {
        var fs = require("fs"); // Import the util library

        // Read and parse the names - filter out whitespace-only names
        this.randomNames = fs.readFileSync(__dirname + "/botnames.txt", "utf8").split(/[\r\n]+/).filter(function(x) {
            return x != ''; // filter empty names
        });
    } catch (e) {
        // Nothing, use the default names
    }

    this.nameIndex = 0;
};

GogyBotLoader.prototype.addBot = function() {
    var s = new FakeSocket(this.gameServer);
    s.playerTracker = new GogyBotPlayer(this.gameServer, s);
    s.packetHandler = new PacketHandler(this.gameServer, s);

    // Add to client list
    this.gameServer.clients.push(s);

    // Add to world
    s.packetHandler.setNickname(this.getName());

    this.gameServer.gogyBot = s.playerTracker;
};

