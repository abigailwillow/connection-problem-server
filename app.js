const WebSocket = require('ws');
const db = require('./lib/database.js');
const server = new WebSocket.Server({
    port: 6969,
}, () => console.log(`Websocket server running on port ${server.address().port}`));

server.on('connection', (socket, request) => {
    let steamid = request.url.match(/\d+/);
    let name;
    if (steamid) {
        let connectedSince = Date.now();
        steamid = steamid[0]
        console.log(`Player ${steamid} connected (${request.socket.remoteAddress})`);

        socket.on('message', message => {
            let identification;
            try {
                identification = JSON.parse(message);
            } catch (err) {
                socket.send(JSON.stringify({message: "Invalid JSON, please try again", error: err.message}));
                return;
            }
            if (identification.name) {
                name = identification.name;
                socket.send(JSON.stringify({message: `Name updated to ${name}`}));
            } else {
                socket.send(JSON.stringify({message: "No name specified, please try again"}));
            }
        });
        
        db.getScore(steamid, score => {
            score = score ?? 0;
            socket.on('close', (code, reason) => {
                let connectedTime = (Date.now() - connectedSince) / 1000;
                console.log(`Player ${name ?? steamid} disconnected after ${connectedTime} seconds (${request.socket.remoteAddress}) ${reason ? `because of ${reason}`: ''}`);
                db.upsertScore(steamid, name ?? steamid, score + connectedTime);
            });
            socket.send(JSON.stringify({steamid: steamid, name: name ?? steamid, score: score}));
        });

        setInterval(() => {
            db.getScores(10, scores => {
                if (scores) {
                    socket.send(JSON.stringify(scores));
                }
            });
        }, 30000);
    } else {
        console.log(`Invalid SteamID tried to connect (${request.socket.remoteAddress})`)
        socket.send(JSON.stringify({message: 'Invalid SteamID'}));
        socket.close();
    }
});
