const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');
const db = require('./lib/database.js');
const server = http.createServer();
const scoreServer = new WebSocket.Server({noServer: true});
const leaderboardServer = new WebSocket.Server({noServer: true});
const port = 6969;

scoreServer.on('connection', (socket, request) => {
    let name;
    let steamid = request.url.match(/\d+/);
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
            cron.schedule(('*/30 * * * * *'), () => {
                updateScore(steamid, name, score, connectedSince);
            });

            socket.on('close', () => {
                console.log(`Player ${name ?? steamid} disconnected from score server (${request.socket.remoteAddress})`);
                updateScore(steamid, name, score, connectedSince);
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
    cron.schedule(('*/30 * * * * *'), () => {
        sendLeaderboard(socket);
    });

    socket.on('close', () => {
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

cron.schedule('0 0 * * *', () => {
    console.log('Making a backup of the database');
    if (!fs.existsSync('backup')) {
        fs.mkdirSync('backup')
    }
    fs.copyFile('data.db', `backup/data-${Date.now()}.db`, err => {
        if (err) {
            throw err; 
        }
    });
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
