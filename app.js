'use strict';

const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const SteamAPI = require('steamapi');
const cron = require('node-cron');
const db = require('./lib/database.js');
const server = http.createServer();
const steam = new SteamAPI(JSON.parse(fs.readFileSync('credentials.json')).steamApiKey);
const scoreServer = new WebSocket.Server({noServer: true});
const leaderboardServer = new WebSocket.Server({noServer: true});
const port = 6969;

scoreServer.on('connection', (client, request) => {
    let steamid = request.url.match(/\d+/);
    if (steamid) {
        let connectedSince = Date.now();
        let schedule;
        steam.getUserSummary(steamid[0]).then(steamUser => {
            console.log(`${steamUser.nickname} connected to score server (${steamUser.steamID}/${request.socket.remoteAddress})`);

            db.getScore(steamid, score => {
                score = score ?? 0;
                schedule = cron.schedule(('*/30 * * * * *'), () => {
                    updateScore(steamUser.steamID, steamUser.nickname, score, connectedSince);
                });
    
                client.on('close', () => {
                    console.log(`${steamUser.nickname} disconnected from score server (${steamUser.steamID}/${request.socket.remoteAddress})`);
                    updateScore(steamid, steamUser.nickname, score, connectedSince);
                    schedule.destroy();
                });
                client.send(JSON.stringify({score: score}));
            });
        });
    } else {
        console.log(`Invalid SteamID tried to connect (${request.socket.remoteAddress})`)
        client.send(JSON.stringify({message: 'Invalid SteamID'}));
        client.close();
    }
});

leaderboardServer.on('connection', (client, request) => {
    console.log(`Player connected to leaderboard (${request.socket.remoteAddress})`);
    sendLeaderboard(client);

    client.on('close', () => {
        console.log(`Player disconnected from leaderboard (${request.socket.remoteAddress})`);
    });
});

// Attempt to update clients' leaderboard every 30 seconds
cron.schedule(('*/30 * * * * *'), () => {
    leaderboardServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            sendLeaderboard(client);
        }
    });
});

// Create a database backup every day at 00:00
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

function sendLeaderboard(client) {
    db.getScores(10, scores => {
        if (scores) {
            let index = 0;
            scores.forEach(score => {
                steam.getUserSummary(score.steamid).then(steamUser => {
                    score.name = steamUser.nickname;
                    score.avatar = steamUser.avatar.small;
                    
                    if (++index >= scores.length) {
                        client.send(JSON.stringify(scores));
                    }
                });
            });
        }
    });
}

function updateScore(steamid, name, oldScore, connectedSince) {
    let connectedTime = (Date.now() - connectedSince) / 1000;
    name = name ?? steamid;
    db.upsertScore(steamid, name, oldScore + connectedTime);
}