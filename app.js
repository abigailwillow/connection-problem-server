const http = require('http');
const WebSocket = require('ws');
const db = require('./lib/database.js');
const server = http.createServer();
const scoreServer = new WebSocket.Server({noServer: true});
const leaderboardServer = new WebSocket.Server({noServer: true});
const port = 6969;

scoreServer.on('connection', (socket, request) => {
    let steamid = request.url.match(/\d+/);
    let name;
    if (steamid) {
        let connectedSince = Date.now();
        steamid = steamid[0]
        console.log(`Player ${steamid} connected to score server (${request.socket.remoteAddress})`);

        socket.on('message', message => {
            let identification;
            try { identification = JSON.parse(message); } catch (err) { return; }
            if (identification.name) {
                name = identification.name;
                console.log(`Name updated to ${name} (${steamid})`);
            }
        });
        
        db.getScore(steamid, score => {
            score = score ?? 0;
            let interval = setInterval(() => {
                updateScore(steamid, name, score, connectedSince);
            }, 30000);

            socket.on('close', () => {
                console.log(`Player ${name ?? steamid} disconnected from score server (${request.socket.remoteAddress})`);
                updateScore(steamid, name, score, connectedSince);
                clearInterval(interval);
            });
            socket.send(JSON.stringify({steamid: steamid, name: name ?? steamid, score: score}));
        });
    } else {
        console.log(`Invalid SteamID tried to connect (${request.socket.remoteAddress})`)
        socket.send(JSON.stringify({message: 'Invalid SteamID'}));
        socket.close();
    }
});

leaderboardServer.on('connection', (socket, request) => {
    console.log(`Player connected to leaderboard (${request.socket.remoteAddress})`);

    sendLeaderboard(socket);
    let interval = setInterval(() => {
        sendLeaderboard(socket);
    }, 30000);

    socket.on('close', () => {
        console.log(`Player disconnected from leaderboard (${request.socket.remoteAddress})`);
        clearInterval(interval);
    });
});

server.on('upgrade', (request, socket, head) => {
    if (/\/score\/\d+/.test(request.url)) {
        scoreServer.handleUpgrade(request, socket, head, ws => {
            scoreServer.emit('connection', ws, request);
        });
    } else if (request.url === '/leaderboard') {
        leaderboardServer.handleUpgrade(request, socket, head, ws => {
            leaderboardServer.emit('connection', ws, request);
          });
    } else {
        socket.destroy();
    }
});

server.listen(port, () => {
    console.log(`Websocket server running on port ${port}`)
});

function sendLeaderboard(socket) {
    db.getScores(10, scores => {
        if (scores) {
            socket.send(JSON.stringify(scores));
        }
    });
}

function updateScore(steamid, name, oldScore, connectedSince) {
    let connectedTime = (Date.now() - connectedSince) / 1000;
    name = name ?? steamid;
    db.upsertScore(steamid, name, oldScore + connectedTime);
}
