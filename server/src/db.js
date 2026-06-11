import initSqlJs from 'sql.js';

let db = null;

export async function initDB() {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      skill_type TEXT DEFAULT 'shield',
      code TEXT NOT NULL DEFAULT '',
      code_version INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      elo INTEGER DEFAULT 1000,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      challenger_id TEXT NOT NULL,
      defender_id TEXT NOT NULL,
      winner_id TEXT,
      challenger_kills INTEGER DEFAULT 0,
      defender_kills INTEGER DEFAULT 0,
      frames INTEGER DEFAULT 0,
      replay TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      api_key TEXT DEFAULT '',
      online INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS match_queue (
      user_id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 插入两个默认精灵用于本地演示
  const count = db.exec("SELECT COUNT(*) as c FROM pets");
  if (count[0].values[0][0] === 0) {
    db.run("INSERT INTO pets (id, name, owner_id, skill_type, code) VALUES (?, ?, ?, ?, ?)",
      ['pet-dragon', '小火龙', 'system', 'shield', 'function onIdle(me, enemy, game) { me.go(); }']);
    db.run("INSERT INTO pets (id, name, owner_id, skill_type, code) VALUES (?, ?, ?, ?, ?)",
      ['pet-sprite', '水灵灵', 'system', 'shield', 'function onIdle(me, enemy, game) { me.go(); }']);
  }

  console.log('✅ 数据库初始化完成');
  return db;
}

export function getDB() { return db; }
