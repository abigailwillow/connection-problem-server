let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('../data.db', createTables);

function createTables(err) {
    if (err) { throw err; }
    db.run('CREATE TABLE IF NOT EXISTS Leaderboard (steamid TEXT PRIMARY KEY, score REAL NOT NULL)');
}

exports.getScore = (steamid, callback) => {
    db.get('SELECT score FROM Leaderboard WHERE steamid=?', steamid, (err, row) => {
        if (err) { throw err; }
        callback(row.score);
     });
}

exports.getScores = (max = 10, callback) => {
    db.all('SELECT steamid, score FROM Leaderboard LIMIT ?', max, (err, rows) => {
        if (err) { throw err; }
        callback(rows);
    });
}

exports.upsertScore = (steamid, score = 0, callback) => {
    db.run('INSERT OR REPLACE INTO Leaderboard (steamid, score) VALUES (?,?)', steamid, score, err => {
        if (callback)
            callback(err)
    });
}