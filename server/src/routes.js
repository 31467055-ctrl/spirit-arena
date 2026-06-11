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

// ===== AI 生成脚本 =====
router.post('/ai/generate-script', async (req, res) => {
  const { prompt, petName, apiKey, provider } = req.body;
  if (!prompt || !apiKey) return res.status(400).json({ error: 'prompt and apiKey required' });

  const systemPrompt = `你是一个精灵对战游戏的JavaScript脚本生成器。用户会告诉你想要什么打法，你生成对应的onIdle函数代码。

规则：
- 只输出JavaScript代码，不要解释
- 函数名必须是 onIdle(me, enemy, game)
- me.go()=前进  me.turn("left"/"right")=转向  me.fire()=攻击
- me.shield()=护盾  me.cloak()=隐身  me.boost()=加速
- me.position=[x,y]  enemy.position=[x,y]  game.star=[x,y]或null  game.map[x][y]="."/"x"/"o"
- 用BFS寻路: 先水平走到目标同一列,再垂直走
- 优先抢星星(game.star), 有敌人在射程内(<6格)就面向敌人开火
- 近身(<4格)开盾, 打不过可以跑
- 闲置时巡逻`;

  try {
    const baseUrl = provider === 'deepseek' 
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${petName ? '精灵名：' + petName + '。' : ''}用户需求：${prompt}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    // 提取代码块
    const match = text.match(/function onIdle[\s\S]*?^}/m) || text.match(/```(?:javascript)?([\s\S]*?)```/);
    const code = match ? (match[1] || match[0]).trim() : text.trim();
    
    if (code.startsWith('function') || code.includes('onIdle')) {
      res.json({ code });
    } else {
      res.json({ error: 'AI没有生成有效的脚本', raw: text.substring(0, 200) });
    }
  } catch (e) {
    res.json({ error: e.message });
  }
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

// ===== 匹配对战 =====

// 加入匹配队列
router.post('/match/join', (req, res) => {
  const { userId, petId } = req.body;
  if (!userId || !petId) return res.status(400).json({ error: 'userId and petId required' });
  const db = getDB();

  // 检查是否有其他人在等
  const waiting = db.exec("SELECT user_id, pet_id FROM match_queue WHERE user_id != ? ORDER BY created_at ASC LIMIT 1", [userId]);
  
  if (waiting[0] && waiting[0].values.length > 0) {
    // 有人匹配上了！
    const [opponentUserId, opponentPetId] = waiting[0].values[0];
    
    // 从队列移除对手
    db.run("DELETE FROM match_queue WHERE user_id = ?", [opponentUserId]);
    
    // 获取双方的精灵代码
    const r1 = db.exec("SELECT id, name, code FROM pets WHERE id = ?", [petId]);
    const r2 = db.exec("SELECT id, name, code FROM pets WHERE id = ?", [opponentPetId]);
    
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
      matched: true,
      matchId,
      winner: result.winner,
      myKills: result.kills[0],
      opponentKills: result.kills[1],
      opponentName: dName,
    });
  } else {
    // 没人等，自己进队列
    db.run("INSERT OR REPLACE INTO match_queue (user_id, pet_id) VALUES (?, ?)", [userId, petId]);
    res.json({ matched: false, waiting: true });
  }
});

// 退出匹配队列
router.post('/match/leave', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const db = getDB();
  db.run("DELETE FROM match_queue WHERE user_id = ?", [userId]);
  res.json({ ok: true });
});

// 检查匹配状态（轮询用）
router.get('/match/status', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const db = getDB();
  // 检查是否有对战结果——这里简化处理，直接查看匹配队列状态
  const inQueue = db.exec("SELECT COUNT(*) as c FROM match_queue WHERE user_id = ?", [userId]);
  const waiting = inQueue[0] && inQueue[0].values[0][0] > 0;
  res.json({ waiting });
});

export default router;
