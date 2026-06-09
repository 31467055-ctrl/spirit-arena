import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDB } from './db.js';
import { runBattle } from './engine.js';

const router = Router();

// 创建一个精灵
router.post('/pets', (req, res) => {
  const { name, ownerId } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = 'pet-' + uuid().slice(0, 8);
  const db = getDB();
  const defaultCode = `function onIdle(me, enemy, game) {
  if (game.star) {
    const [sx, sy] = game.star;
    me.go();
  } else {
    me.go();
  }
}`;
  db.run("INSERT INTO pets (id, name, owner_id, code) VALUES (?, ?, ?, ?)",
    [id, name, ownerId || 'guest', defaultCode]);
  res.json({ id, name });
});

// 获取精灵列表
router.get('/pets', (req, res) => {
  const db = getDB();
  const r = db.exec("SELECT id, name, owner_id, wins, losses, elo FROM pets ORDER BY elo DESC");
  const pets = r[0] ? r[0].values.map(v => ({
    id: v[0], name: v[1], ownerId: v[2], wins: v[3], losses: v[4], elo: v[5]
  })) : [];
  res.json(pets);
});

// 获取单个精灵
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

// 发起对战（两个精灵的ID）
router.post('/battle', (req, res) => {
  const { challengerId, defenderId } = req.body;
  if (!challengerId || !defenderId) {
    return res.status(400).json({ error: 'challengerId and defenderId required' });
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

  // 保存对战记录
  const matchId = 'match-' + uuid().slice(0, 8);
  let winnerId = null;
  if (result.winnerId === 0) winnerId = cId;
  else if (result.winnerId === 1) winnerId = dId;

  db.run(
    "INSERT INTO matches (id, challenger_id, defender_id, winner_id, challenger_kills, defender_kills, frames, replay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [matchId, cId, dId, winnerId, result.kills[0], result.kills[1], result.frames, JSON.stringify(result.replay)]
  );

  // 更新战绩
  if (winnerId === cId) {
    db.run("UPDATE pets SET wins = wins + 1, elo = elo + 16 WHERE id = ?", [cId]);
    db.run("UPDATE pets SET losses = losses + 1, elo = MAX(0, elo - 16) WHERE id = ?", [dId]);
  } else if (winnerId === dId) {
    db.run("UPDATE pets SET wins = wins + 1, elo = elo + 16 WHERE id = ?", [dId]);
    db.run("UPDATE pets SET losses = losses + 1, elo = MAX(0, elo - 16) WHERE id = ?", [cId]);
  }

  res.json({
    matchId,
    winner: result.winner,
    challengerKills: result.kills[0],
    defenderKills: result.kills[1],
    frames: result.frames,
  });
});

// 获取对战记录
router.get('/matches', (req, res) => {
  const db = getDB();
  const r = db.exec(
    "SELECT m.id, m.challenger_id, c.name as c_name, m.defender_id, d.name as d_name, m.winner_id, m.challenger_kills, m.defender_kills, m.created_at FROM matches m LEFT JOIN pets c ON m.challenger_id = c.id LEFT JOIN pets d ON m.defender_id = d.id ORDER BY m.created_at DESC LIMIT 20"
  );
  const matches = r[0] ? r[0].values.map(v => ({
    id: v[0], challenger: {id: v[1], name: v[2]}, defender: {id: v[3], name: v[4]},
    winnerId: v[5], challengerKills: v[6], defenderKills: v[7], createdAt: v[8],
  })) : [];
  res.json(matches);
});

// 获取回放数据
router.get('/matches/:id/replay', (req, res) => {
  const db = getDB();
  const r = db.exec("SELECT replay FROM matches WHERE id = ?", [req.params.id]);
  if (!r[0] || !r[0].values.length) return res.status(404).json({ error: 'not found' });
  res.json(JSON.parse(r[0].values[0][0]));
});

export default router;
