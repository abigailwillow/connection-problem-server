let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('data.db', initializeDatabase);

function initializeDatabase(err) {
    if (err) { throw err; }
    // Create tables if they don't already exist
    db.run('CREATE TABLE IF NOT EXISTS Leaderboard (steamid TEXT UNIQUE PRIMARY KEY NOT NULL, score REAL NOT NULL)');
}

exports.getScore = (steamid, callback) => {
    db.get('SELECT steamid, score FROM Leaderboard WHERE steamid=?', steamid, (err, row) => {
        if (err) { throw err; }
        row ? callback(row.score) : callback(null);
     });
}

exports.getScores = (max = 10, callback) => {
    db.all('SELECT steamid, score FROM Leaderboard ORDER BY score DESC LIMIT ?', max, (err, rows) => {
        if (err) { throw err; }
        callback(rows ?? null);
    });
}

exports.upsertScore = (steamid, score, callback) => {
    db.run('INSERT OR REPLACE INTO Leaderboard (steamid, score) VALUES (?,?)', steamid, score, err => {
        if (callback)
            callback(err ?? null)
    });
}
