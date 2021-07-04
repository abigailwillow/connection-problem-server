let fs = require('fs');
let express = require('express');
let app = express();
let db = require('./lib/database.js');
const TOKEN = JSON.parse(fs.readFileSync('token.json'));

app.listen(6969, () => {
    console.log('API Server running on port 6969')
});

app.use(express.json());

app.use((request, response, next) => {
    if (request.headers.authorization !== TOKEN) {
        response.status(403).json({error: 'No valid authorization token supplied'})
    }
    next();
});

app.get('/scores', (request, response) => {
    db.getScores(request.query.limit, leaderboard => response.json(leaderboard));
});

app.get('/score/:steamid', (request, response) => {
    let steamid = request.params.steamid;
    db.getScore(steamid, score => response.json({steamid: steamid, score: score}))
});

app.post('/score/:steamid', (request, response) => {
    let steamid = request.params.steamid;
    db.upsertScore(steamid, request.body.score, err => {
        if (!err) {
            response.json({message: `Set score for ${steamid} to ${request.body.score}`});
        } else {
            response.status(500);
            response.json({message: `Unable to update score for ${steamid}`, error: err});
        }
    });
});