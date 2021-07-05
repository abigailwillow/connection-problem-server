let fs = require('fs');
let express = require('express');
let app = express();
let db = require('./lib/database.js');
const TOKEN = JSON.parse(fs.readFileSync('credentials.json')).token;

app.listen(6969, () => {
    console.log('API Server running on port 6969');
});

app.use(express.json());

app.use((request, response, next) => {
    if (request.headers.authorization !== `Basic ${TOKEN}`) {
        response.status(403).json({message: 'No valid authorization token supplied'});
    }
    next();
});

app.get('/scores', (request, response) => {
    db.getScores(request.query.limit, leaderboard => {
        if (leaderboard) {
            response.status(200);
            response.json(leaderboard);
        } else {
            response.status(404);
            response.json({message: "Could not get scores"});
        }
    });
});

app.get('/score/:steamid', (request, response) => {
    db.getScore(request.params.steamid, (steamid, name, score) => {
        if (steamid) {
            response.status(200);
            response.json({steamid: steamid, name: name, score: score});
        } else {
            response.status(404);
            response.json({message: `Could not get score for SteamID ${request.params.steamid}`});
        } 
    });
});

app.post('/score/:steamid', (request, response) => {
    db.upsertScore(request.body.steamid, request.body.name, request.body.score, err => {
        if (!err) {
            response.status(200);
            response.json({steamid: request.body.steamid, name: request.body.name, score: request.body.score});
        } else {
            response.status(404);
            response.json({message: `Unable to update score for ${request.body.name}`, error: err});
        }
    });
});
