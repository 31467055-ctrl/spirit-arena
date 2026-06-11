import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDB } from './db.js';
import { runBattle } from './engine.js';

const router = Router();

// ===== 用户API =====

// 注册/登录（简单用户名密码）
router.post('/auth/register', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  if (username.length < 2) return res.status(400).json({ error: 'username too short' });
  const db = getDB();
  // 检查是否已存在
  const exist = db.exec("SELECT id FROM users WHERE username = ?", [username]);
  if (exist[0] && exist[0].values.length) {
    return res.json({ id: exist[0].values[0][0], username, existing: true });
  }
  const id = 'user-' + uuid().slice(0, 8);
  db.run("INSERT INTO users (id, username, nickname) VALUES (?, ?, ?)", [id, username, username]);
  res.json({ id, username, existing: false });
});

// 获取用户信息
router.get('/users/:id', (req, res) => {
  const db = getDB();
  const r = db.exec("SELECT id, username, nickname FROM users WHERE id = ?", [req.params.id]);
  if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'not found' });
  const v = r[0].values[0];
  res.json({ id: v[0], username: v[1], nickname: v[2] });
});

// 保存用户的API Key
router.put('/users/:id/apikey', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
  const db = getDB();
  db.run("UPDATE users SET api_key = ? WHERE id = ?", [apiKey, req.params.id]);
  res.json({ ok: true });
});

// ===== 精灵API =====

// 创建精灵
router.post('/pets', (req, res) => {
  const { name, ownerId, petType } = req.body;
  if (!name || !ownerId) return res.status(400).json({ error: 'name and ownerId required' });
  const id = 'pet-' + uuid().slice(0, 8);
  const db = getDB();
  const defaultCode = `function onIdle(me, enemy, game) {
  if (game.star) {
    me.go();
  } else {
    me.go();
  }
}`;
  db.run("INSERT INTO pets (id, name, owner_id, skill_type, code) VALUES (?, ?, ?, ?, ?)",
    [id, name, ownerId, petType || 'shield', defaultCode]);
  res.json({ id, name, ownerId });
});

// 获取精灵列表（支持按用户筛选）
router.get('/pets', (req, res) => {
  const db = getDB();
  const { ownerId } = req.query;
  let sql = "SELECT id, name, owner_id, skill_type, wins, losses, elo, code_version FROM pets";
  let params = [];
  if (ownerId) { sql += " WHERE owner_id = ?"; params.push(ownerId); }
  sql += " ORDER BY elo DESC";
  const r = db.exec(sql, params);
  const pets = r[0] ? r[0].values.map(v => ({
    id: v[0], name: v[1], ownerId: v[2], skillType: v[3],
    wins: v[4], losses: v[5], elo: v[6], codeVersion: v[7],
  })) : [];
  res.json(pets);
});

// 获取单个精灵（完整信息含代码）
router.get('/pets/:id', (req, res) => {
  const db = getDB();
  const r = db.exec("SELECT * FROM pets WHERE id = ?", [req.params.id]);
  if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'not found' });
  const v = r[0].values[0];
  res.json({
    id: v[0], name: v[1], ownerId: v[2], skillType: v[3],
    code: v[4], codeVersion: v[5],
    wins: v[6], losses: v[7], draws: v[8], elo: v[9],
  });
});

// 更新精灵代码
router.put('/pets/:id/code', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  const db = getDB();
  db.run("UPDATE pets SET code = ?, code_version = code_version + 1 WHERE id = ?",
    [code, req.params.id]);
  res.json({ ok: true });
});

// ===== Agent API（给AI调用的接口） =====
router.get('/agent/pet', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'no token' });
  const db = getDB();
  const r = db.exec("SELECT * FROM pets WHERE id = ?", [token]);
  if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'pet not found' });
  const v = r[0].values[0];
  res.json({
    tank: { id: v[0], name: v[1], skillType: v[3] },
    skill: { type: v[3], name: v[3], hasSkill: true },
    code: v[4],
    guideUrl: 'https://spirit-arena.vercel.app/battle.html',
  });
});

router.post('/agent/pet/code', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { code, submittedBy } = req.body;
  if (!token) return res.status(401).json({ error: 'no token' });
  if (!code || !submittedBy) return res.status(400).json({ error: 'code and submittedBy required' });
  const db = getDB();
  db.run("UPDATE pets SET code = ?, code_version = code_version + 1 WHERE id = ?", [code, token]);
  res.json({ ok: true, tank: { id: token } });
});

// ===== 对战 =====
router.post('/battle', (req, res) => {
  const { challengerId, defenderId } = req.body;
  if (!challengerId || !defenderId) {
    return res.status(400).json({ error: 'challenger and defender required' });
  }
  const db = getDB();
  const r1 = db.exec("SELECT id, name, code FROM pets WHERE id = ?", [challengerId]);
  const r2 = db.exec("SELECT id, name, code FROM pets WHERE id = ?", [defenderId]);
  if (!r1[0] || !r1[0].values.length || !r2[0] || !r2[0].values.length) {
    return res.status(404).json({ error: 'pet not found' });
  }
  const [cId, cName, cCode] = r1[0].values[0];
  const [dId, dName, dCode] = r2[0].values[0];
  const result = runBattle(cCode, cName, dCode, dName);

  const matchId = 'match-' + uuid().slice(0, 8);
  let winnerId = null;
  if (result.winnerId === 0) winnerId = cId;
  else if (result.winnerId === 1) winnerId = dId;

  db.run(
    "INSERT INTO matches (id, challenger_id, defender_id, winner_id, challenger_kills, defender_kills, frames, replay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [matchId, cId, dId, winnerId, result.kills[0], result.kills[1], result.frames, JSON.stringify(result.replay)]
  );

  if (winnerId === cId) {
    db.run("UPDATE pets SET wins = wins + 1, elo = elo + 16 WHERE id = ?", [cId]);
    db.run("UPDATE pets SET losses = losses + 1, elo = MAX(0, elo - 16) WHERE id = ?", [dId]);
  } else if (winnerId === dId) {
    db.run("UPDATE pets SET wins = wins + 1, elo = elo + 16 WHERE id = ?", [dId]);
    db.run("UPDATE pets SET losses = losses + 1, elo = MAX(0, elo - 16) WHERE id = ?", [cId]);
  }

  res.json({
    matchId, winner: result.winner,
    challengerKills: result.kills[0], defenderKills: result.kills[1],
    frames: result.frames,
  });
});

// 对战记录
router.get('/matches', (req, res) => {
  const db = getDB();
  const { petId } = req.query;
  let sql = "SELECT m.id, m.challenger_id, c.name as c_name, m.defender_id, d.name as d_name, m.winner_id, m.challenger_kills, m.defender_kills, m.created_at FROM matches m LEFT JOIN pets c ON m.challenger_id = c.id LEFT JOIN pets d ON m.defender_id = d.id";
  let params = [];
  if (petId) { sql += " WHERE m.challenger_id = ? OR m.defender_id = ?"; params.push(petId, petId); }
  sql += " ORDER BY m.created_at DESC LIMIT 20";
  const r = db.exec(sql, params);
  const matches = r[0] ? r[0].values.map(v => ({
    id: v[0], challenger: {id: v[1], name: v[2]}, defender: {id: v[3], name: v[4]},
    winnerId: v[5], challengerKills: v[6], defenderKills: v[7], createdAt: v[8],
  })) : [];
  res.json(matches);
});

// 回放
router.get('/matches/:id/replay', (req, res) => {
  const db = getDB();
  const r = db.exec("SELECT replay FROM matches WHERE id = ?", [req.params.id]);
  if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'not found' });
  res.json(JSON.parse(r[0].values[0][0]));
});

// 排行榜
router.get('/leaderboard', (req, res) => {
  const db = getDB();
  const r = db.exec("SELECT id, name, owner_id, wins, losses, elo, code_version FROM pets ORDER BY elo DESC LIMIT 50");
  const list = r[0] ? r[0].values.map((v, i) => ({
    rank: i + 1, id: v[0], name: v[1], ownerId: v[2],
    wins: v[3], losses: v[4], elo: v[5], codeVersion: v[6],
  })) : [];
  res.json(list);
});

export default router;
