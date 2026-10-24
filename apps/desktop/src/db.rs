use rusqlite::{Connection, params};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::path::Path;

pub const MAX: i64 = 9_000_000_000_000;
pub const WELCOME: i64 = 193_627;
pub fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
pub fn secret() -> String {
    format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    )
}
pub fn hash(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}

pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL CHECK(balance>=0 AND balance<=9000000000000), coins INTEGER NOT NULL DEFAULT 0 CHECK(coins>=0), admin INTEGER NOT NULL DEFAULT 0, daily INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY, player TEXT NOT NULL REFERENCES players(id), token TEXT UNIQUE NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, seen INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, player TEXT REFERENCES players(id), expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY, player TEXT NOT NULL REFERENCES players(id), delta INTEGER NOT NULL, coins INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL, time INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS holdings(player TEXT REFERENCES players(id), asset TEXT NOT NULL, units INTEGER NOT NULL CHECK(units>=0), PRIMARY KEY(player,asset));
        CREATE TABLE IF NOT EXISTS requests(player TEXT NOT NULL, key TEXT NOT NULL, body TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(player,key));
        CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, player TEXT NOT NULL REFERENCES players(id), game TEXT NOT NULL, opened INTEGER NOT NULL, invested INTEGER NOT NULL DEFAULT 0, closed INTEGER NOT NULL DEFAULT 0);
        CREATE UNIQUE INDEX IF NOT EXISTS active_game ON sessions(player,game) WHERE closed=0;
        CREATE TABLE IF NOT EXISTS claims(id TEXT PRIMARY KEY, session TEXT UNIQUE NOT NULL REFERENCES sessions(id), player TEXT NOT NULL REFERENCES players(id), amount INTEGER NOT NULL, coins INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', time INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS game_saves(player TEXT NOT NULL REFERENCES players(id),game TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(player,game));
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);")?;
    Ok(conn)
}

pub fn owner(c: &mut Connection, token: &str) -> rusqlite::Result<()> {
    let tx = c.transaction()?;
    tx.execute(
        "INSERT OR IGNORE INTO players(id,name,balance,admin) VALUES('owner','Cammo',?1,1)",
        [WELCOME],
    )?;
    tx.execute("INSERT INTO devices(id,player,token) VALUES('owner','owner',?1) ON CONFLICT(id) DO UPDATE SET token=excluded.token, revoked=0", [hash(token)])?;
    tx.commit()
}

pub fn player(c: &Connection, id: &str) -> rusqlite::Result<Value> {
    c.query_row("SELECT id,name,balance,coins,admin FROM players WHERE id=?1", [id], |r| Ok(json!({
        "id":r.get::<_,String>(0)?, "name":r.get::<_,String>(1)?, "balance":r.get::<_,i64>(2)?, "coins":r.get::<_,i64>(3)?, "admin":r.get::<_,bool>(4)?
    })))
}

pub fn move_money(
    c: &Connection,
    id: &str,
    delta: i64,
    coins: i64,
    reason: &str,
) -> Result<(), String> {
    if delta.abs() > MAX || coins.abs() > MAX {
        return Err("Importo fuori limite".into());
    }
    let changed = c.execute("UPDATE players SET balance=balance+?2,coins=coins+?3 WHERE id=?1 AND balance+?2 BETWEEN 0 AND 9000000000000 AND coins+?3 BETWEEN 0 AND 9000000000000", params![id,delta,coins]).map_err(|e| e.to_string())?;
    if changed != 1 {
        return Err("Saldo insufficiente o limite del portafoglio raggiunto".into());
    }
    c.execute(
        "INSERT INTO ledger(player,delta,coins,reason,time) VALUES(?1,?2,?3,?4,?5)",
        params![id, delta, coins, reason, now()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
