let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('data.db', createTables);

function createTables(err) {
    if (err) { throw err; }
    db.run('CREATE TABLE IF NOT EXISTS Leaderboard (steamid TEXT UNIQUE PRIMARY KEY NOT NULL, name TEXT NOT NULL, score REAL NOT NULL)');
}

exports.getScore = (steamid, callback) => {
    db.get('SELECT steamid, name, score FROM Leaderboard WHERE steamid=?', steamid, (err, row) => {
        if (err) { throw err; }
        row ? callback(row.steamid.toString(), row.name, row.score) : callback(false);
     });
}

exports.getScores = (max = 10, callback) => {
    db.all('SELECT steamid, name, score FROM Leaderboard LIMIT ?', max, (err, rows) => {
        if (err) { throw err; }
        callback(rows ?? false);
    });
}

exports.upsertScore = (steamid, name, score = 0, callback) => {
    db.run('INSERT OR REPLACE INTO Leaderboard (steamid, name, score) VALUES (?,?,?)', steamid, name, score, err => {
        if (callback)
            callback(err ?? false)
    });
}
