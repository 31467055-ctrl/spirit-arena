// 战斗引擎核心 — 纯逻辑，无渲染
// 可以被服务端调用执行对战

// ===== 常量 =====
export const COLS = 10, ROWS = 10;
export const T = { EMPTY: '.', WALL: 'x', GRASS: 'o' };
export const D = { UP:0, RIGHT:1, DOWN:2, LEFT:3, dx:[0,1,0,-1], dy:[-1,0,1,0] };

// ===== 配置 =====
const MAX_FRAMES = 450;
const KILL_LIMIT = 3;
const AI_INTERVAL = 6;
const SHIELD_DUR = 20;
const SHIELD_CD = 80;
const BOOST_DUR = 15;

// ===== 地图 =====
const MAP_TEMPLATE = [
  ['.','.','x','.','.','.','.','x','.','.'],
  ['.','.','.','.','o','o','.','.','.','.'],
  ['x','.','.','x','.','.','x','.','.','x'],
  ['.','o','.','.','.','.','.','.','o','.'],
  ['.','.','.','.','.','.','.','.','.','.'],
  ['.','.','.','.','.','.','.','.','.','.'],
  ['.','o','.','.','.','.','.','.','o','.'],
  ['x','.','.','x','.','.','x','.','.','x'],
  ['.','.','.','.','o','o','.','.','.','.'],
  ['.','.','x','.','.','.','.','x','.','.'],
];

function cloneMap() { return MAP_TEMPLATE.map(r => [...r]); }

function bfs(map, sx, sy, ex, ey) {
  if (sx===ex && sy===ey) return [];
  const q = [[sx, sy]];
  const visited = Array.from({length:ROWS}, () => Array(COLS).fill(false));
  const prev = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  visited[sy][sx] = true;
  while (q.length > 0) {
    const [cx, cy] = q.shift();
    for (let d=0; d<4; d++) {
      const nx = cx + D.dx[d], ny = cy + D.dy[d];
      if (nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      if (visited[ny][nx]) continue;
      if (map[ny][nx] === T.WALL) continue;
      visited[ny][nx] = true;
      prev[ny][nx] = [cx, cy, d];
      if (nx===ex && ny===ey) {
        const path = [];
        let px=nx, py=ny;
        while (px!==sx || py!==sy) {
          const [ppx, ppy, dir] = prev[py][px];
          path.unshift(dir);
          px = ppx; py = ppy;
        }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return [];
}

function turnDir(currentDir, targetDir) {
  const diff = (targetDir - currentDir + 4) % 4;
  if (diff === 0) return null;
  return diff === 1 ? 'right' : diff === 3 ? 'left' : 'right';
}

// ===== 精灵 =====
class Pet {
  constructor(id, name, x, y, dir) {
    this.id = id; this.name = name; this.x = x; this.y = y; this.dir = dir;
    this.kills = 0; this.alive = true; this.bullet = null;
    this.shieldF = 0; this.shieldCD = 0; this.boostF = 0; this.cloakF = 0; this.fireLock = 0;
    this.aiCD = 0; this.aiPath = []; this.stuckC = 0;
    this.lastPos = {x:-1, y:-1};
  }
  get shielded() { return this.shieldF > 0; }
}

class Bullet {
  constructor(owner, x, y, dir) {
    this.owner = owner; this.x = x; this.y = y; this.dir = dir; this.alive = true;
  }
}

// ===== 随机位置 =====
function randomPos(map, exclude) {
  const positions = [];
  for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++) {
    if (map[y][x] === T.WALL) continue;
    if (exclude && exclude.some(e => e.x===x && e.y===y)) continue;
    if (exclude && exclude.some(e => Math.abs(e.x-x)+Math.abs(e.y-y) < 3)) continue;
    positions.push({x, y});
  }
  return positions.length > 0
    ? positions[Math.floor(Math.random() * positions.length)]
    : {x:1, y:1};
}

// ===== AI决策 =====
function aiThink(p, enemy, map, star) {
  const m = map;
  const visible = (eid) => {
    const ep = eid === 0 ? p : enemy;
    if (!ep.alive) return false;
    if (m[ep.y][ep.x] === T.GRASS) return false;
    return true;
  };
  const enemyVisible = visible(enemy.id);
  const commands = [];
  const push = (type, data) => commands.push({type, ...data});

  let target = null;
  if (star) target = {x: star.x, y: star.y};
  else if (enemyVisible) target = {x: enemy.x, y: enemy.y};

  // ---- 开火（高优先级） ----
  if (enemyVisible) {
    const dist = Math.abs(p.x-enemy.x) + Math.abs(p.y-enemy.y);
    if (dist <= 6 && dist > 0 && !p.bullet && p.fireLock <= 0) {
      const dx = enemy.x - p.x, dy = enemy.y - p.y;
      let aimDir = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? D.RIGHT : D.LEFT)
        : (dy > 0 ? D.DOWN : D.UP);
      const turn = turnDir(p.dir, aimDir);
      if (turn) {
        commands.unshift({type: 'fire'});
        commands.unshift({type: 'turn', dir: (p.dir + (turn==='right'?1:3)) % 4});
      } else {
        commands.unshift({type: 'fire'});
      }
    }
    if (dist < 5 && p.shieldCD <= 0 && p.shieldF <= 0) {
      commands.push({type: 'shield'});
    }
  }

  // ---- 寻路 ----
  if (target) {
    const path = bfs(map, p.x, p.y, target.x, target.y);
    if (path.length > 0) {
      const stepX = p.x + D.dx[path[0]], stepY = p.y + D.dy[path[0]];
      const blocked = (stepX === enemy.x && stepY === enemy.y);

      if (blocked) {
        let sideDir = -1;
        for (const d of [1, 3]) {
          const sd = (path[0] + d) % 4;
          const sx = p.x + D.dx[sd], sy = p.y + D.dy[sd];
          if (sx>=0 && sx<COLS && sy>=0 && sy<ROWS && m[sy][sx] !== T.WALL) {
            sideDir = sd; break;
          }
        }
        if (sideDir >= 0) {
          const t = turnDir(p.dir, sideDir);
          if (t) push('turn', {dir: (p.dir + (t==='right'?1:3)) % 4});
          push('go');
          if (path.length > 1) {
            const t2 = turnDir(sideDir, path[1]);
            if (t2) push('turn', {dir: (sideDir + (t2==='right'?1:3)) % 4});
            push('go');
          }
        } else {
          push('go');
        }
      } else {
        const steps = Math.min(path.length, 3);
        let simDir = p.dir;
        for (let i=0; i<steps; i++) {
          const dir = path[i];
          const turn = turnDir(simDir, dir);
          if (turn) { const nd = (simDir + (turn==='right'?1:3)) % 4; push('turn', {dir: nd}); simDir = nd; }
          push('go');
        }
      }
    } else {
      for (let i=0; i<3; i++) { push('go'); }
    }
  } else {
    // 闲逛
    const wd = Math.floor(Math.random()*4);
    const t = turnDir(p.dir, wd);
    if (t) push('turn', {dir: (p.dir + (t==='right'?1:3)) % 4});
    for (let i=0; i<3; i++) push('go');
  }

  p.aiPath = commands;
}

function tryMove(p, map, pets) {
  const speed = p.boostF > 0 ? 2 : 1;
  let moved = false;
  for (let i=0; i<speed; i++) {
    const nx = p.x + D.dx[p.dir], ny = p.y + D.dy[p.dir];
    if (nx<0||nx>=COLS||ny<0||ny>=ROWS) break;
    if (map[ny][nx] === T.WALL) break;
    if (pets.some(o=>o.id!==p.id && o.alive && o.x===nx && o.y===ny)) break;
    p.x = nx; p.y = ny; moved = true;
  }
  return moved;
}

function tryFire(p, map, bullets) {
  if (p.bullet || p.fireLock > 0) return false;
  const bx = p.x + D.dx[p.dir], by = p.y + D.dy[p.dir];
  if (bx<0||bx>=COLS||by<0||by>=ROWS) return false;
  if (map[by][bx] === T.WALL) return false;
  const b = new Bullet(p.id, bx, by, p.dir);
  bullets.push(b);
  p.bullet = b;
  return true;
}

// ===== 执行一场对战 =====
export function runBattle(code1, name1, code2, name2) {
  const map = cloneMap();
  const p0pos = randomPos(map, []);
  const p1pos = randomPos(map, [p0pos]);
  const p0 = new Pet(0, name1 || '精灵A', p0pos.x, p0pos.y, Math.floor(Math.random()*4));
  const p1 = new Pet(1, name2 || '精灵B', p1pos.x, p1pos.y, Math.floor(Math.random()*4));
  const pets = [p0, p1];
  const bullets = [];
  let star = null;
  let starTimer = 0;
  let winner = null;
  const replayFrames = [];

  // 编译脚本（安全包装）
  let script0 = null, script1 = null;
  try {
    script0 = new Function('me', 'enemy', 'game', code1 || 'function onIdle(m,e,g){}');
  } catch (e) { script0 = new Function('me','enemy','game','{}'); }
  try {
    script1 = new Function('me', 'enemy', 'game', code2 || 'function onIdle(m,e,g){}');
  } catch (e) { script1 = new Function('me','enemy','game','{}'); }

  function spawnStar() {
    for (let a=0; a<100; a++) {
      const x = Math.floor(Math.random()*COLS), y = Math.floor(Math.random()*ROWS);
      if (map[y][x] === T.WALL || pets.some(p=>p.x===x && p.y===y)) continue;
      star = {x, y}; return;
    }
    for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++) {
      if (map[y][x] !== T.WALL && !pets.some(p=>p.x===x&&p.y===y)) { star = {x, y}; return; }
    }
  }
  spawnStar();

  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    const events = [];

    // buff
    for (const p of pets) {
      if (!p.alive) continue;
      if (p.shieldF > 0) p.shieldF--;
      if (p.shieldCD > 0) p.shieldCD--;
      if (p.boostF > 0) p.boostF--;
      if (p.fireLock > 0) p.fireLock--;
    }

    // AI决策
    for (let i=0; i<2; i++) {
      const p = pets[i], enemy = pets[1-i];
      if (!p.alive) continue;
      // 卡住检测
      if (p.x === p.lastPos.x && p.y === p.lastPos.y) p.stuckC++;
      else { p.stuckC = 0; p.lastPos = {x: p.x, y: p.y}; }
      if (p.stuckC > 6) { p.aiPath = []; p.stuckC = 0; }

      p.aiCD--;
      if (p.aiCD <= 0) {
        p.aiCD = AI_INTERVAL;
        aiThink(p, enemy, map, star);
      }

      // 执行一个命令
      if (p.aiPath.length > 0) {
        const cmd = p.aiPath[0];
        if (cmd.type === 'go') {
          if (tryMove(p, map, pets)) p.aiPath.shift();
        } else {
          p.aiPath.shift();
          if (cmd.type === 'turn') p.dir = cmd.dir;
          else if (cmd.type === 'fire') tryFire(p, map, bullets);
          else if (cmd.type === 'shield' && p.shieldCD <= 0) { p.shieldF = SHIELD_DUR; p.shieldCD = SHIELD_CD; }
        }
      }
    }

    // 子弹移动
    for (const b of bullets) {
      if (!b.alive) continue;
      const nx = b.x + D.dx[b.dir], ny = b.y + D.dy[b.dir];
      if (nx<0||nx>=COLS||ny<0||ny>=ROWS || map[ny][nx]===T.WALL) {
        b.alive = false;
        const owner = pets.find(p=>p.id===b.owner);
        if (owner) owner.bullet = null;
      } else {
        b.x = nx; b.y = ny;
        for (const p of pets) {
          if (p.id === b.owner || !p.alive) continue;
          if (p.x === nx && p.y === ny) {
            if (p.shielded) {
              b.alive = false; p.shieldF = 0;
            } else {
              b.alive = false;
              const attacker = pets.find(o=>o.id===b.owner);
              if (attacker) {
                attacker.kills++;
                events.push({type: 'kill', by: attacker.id, target: p.id, kills: attacker.kills});
                if (attacker.kills >= KILL_LIMIT) {
                  winner = attacker;
                  break;
                }
              }
              // 复活
              const pos = randomPos(map, []);
              p.x = pos.x; p.y = pos.y;
              p.dir = Math.floor(Math.random()*4);
              p.bullet = null; p.shieldF = 0; p.shieldCD = 0;
              p.aiPath = []; p.stuckC = 0;
              events.push({type: 'revive', petId: p.id, x: pos.x, y: pos.y});
            }
            const owner = pets.find(o=>o.id===b.owner);
            if (owner) owner.bullet = null;
            break;
          }
        }
      }
      if (winner) break;
    }
    if (winner) break;

    // 星尘
    if (!star) {
      starTimer++;
      if (starTimer >= 25) { spawnStar(); starTimer = 0; }
    }

    // 记录回放（每3帧记录一次）
    if (frame % 3 === 0) {
      replayFrames.push({
        f: frame,
        p0: [p0.x, p0.y, p0.dir],
        p1: [p1.x, p1.y, p1.dir],
        k0: p0.kills, k1: p1.kills,
        s: star ? [star.x, star.y] : null,
        b: bullets.filter(b=>b.alive).map(b=>({x:b.x, y:b.y, o:b.owner})),
        shield: [p0.shieldF>0, p1.shieldF>0],
        ev: events,
      });
    }
  }

  if (!winner) winner = p0.kills >= p1.kills ? (p0.kills > p1.kills ? p0 : null) : p1;

  return {
    winner: winner ? winner.name : null,
    winnerId: winner ? winner.id : null,
    kills: [p0.kills, p1.kills],
    frames: replayFrames.length,
    replay: replayFrames,
    petNames: [name1, name2],
  };
}
