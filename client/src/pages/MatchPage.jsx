import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const ORDER = ['fire', 'water', 'wind', 'earth']

export default function MatchPage({ API, user }) {
  const [status, setStatus] = useState('idle')
  const [pets, setPets] = useState([])
  const [selectedPet, setSelectedPet] = useState(null)
  const [result, setResult] = useState(null)
  const [replay, setReplay] = useState(null)
  const [replayFrame, setReplayFrame] = useState(0)
  const [matchLog, setMatchLog] = useState([])
  const canvasRef = useRef(null)
  const nav = useNavigate()
  const pollRef = useRef(null)

  // 配置
  const [config, setConfig] = useState({
    stats: { atk: 0, def: 0, spd: 0, hp: 0 },
    crystals: { fire: 0, water: 0, wind: 0, earth: 0 },
    skill: 'heal',
  })

  useEffect(() => { if (!user) return; fetch(API + '/api/pets?ownerId=' + user.id).then(r => r.json()).then(setPets) }, [user])

  const totalStatPoints = 15, totalCrystalPoints = 10

  const adjStat = (key, delta) => {
    const s = { ...config.stats }
    const used = s.atk + s.def + s.spd + s.hp
    if (delta > 0 && used >= totalStatPoints) return
    if (delta < 0 && s[key] <= 0) return
    s[key] += delta
    setConfig({ ...config, stats: s })
  }

  const adjCrystal = (key, delta) => {
    const c = { ...config.crystals }
    const used = c.fire + c.water + c.wind + c.earth
    if (delta > 0 && used >= totalCrystalPoints) return
    if (delta < 0 && c[key] <= 0) return
    // 仅相邻混合
    if (delta > 0 && c[key] === 0) {
      const active = ORDER.filter(k => c[k] > 0)
      if (active.length >= 2) {
        const idx = ORDER.indexOf(key)
        const canAdd = active.some(k => {
          const ki = ORDER.indexOf(k)
          return (idx + 1) % 4 === ki || (idx + 3) % 4 === ki
        })
        if (!canAdd) return
      }
    }
    c[key] += delta
    setConfig({ ...config, crystals: c })
  }

  const joinMatch = async () => {
    if (!selectedPet) return
    setStatus('waiting')
    const r = await fetch(API + '/api/match/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, petId: selectedPet.id, config }),
    })
    const data = await r.json()
    if (data.matched) { onMatched(data) }
    else {
      pollRef.current = setInterval(async () => {
        const sr = await fetch(API + '/api/match/status?userId=' + user.id)
        const sd = await sr.json()
        if (!sd.waiting) {
          clearInterval(pollRef.current)
          const r2 = await fetch(API + '/api/match/join', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, petId: selectedPet.id, config }),
          })
          const d2 = await r2.json()
          if (d2.matched) onMatched(d2)
        }
      }, 2000)
    }
  }

  const onMatched = (data) => {
    setStatus('matched'); setResult(data); setMatchLog(p => [data, ...p].slice(0, 20))
    fetch(API + '/api/matches/' + data.matchId + '/replay').then(r => r.json()).then(rj => { setReplay(rj); setReplayFrame(0) })
  }

  const cancelMatch = async () => {
    clearInterval(pollRef.current)
    await fetch(API + '/api/match/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
    setStatus('idle')
  }

  useEffect(() => {
    if (!replay || !replay.length || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d'); const frame = replay[replayFrame]; if (!frame) return
    const CELL = 60; ctx.clearRect(0, 0, 600, 600)
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const px = x*CELL, py = y*CELL
      ctx.fillStyle = (x+y)%2===0 ? '#3a3a5c' : '#32325a'; ctx.fillRect(px, py, CELL, CELL)
    }
    if(frame.s){ctx.font='30px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⭐',frame.s[0]*CELL+30,frame.s[1]*CELL+30)}
    const colors=['#FF6B6B','#4ECDC4']
    for(let i=0;i<2;i++){const pos=i===0?frame.p0:frame.p1;if(!pos)continue
      const [x,y]=pos;const cx=x*CELL+30,cy=y*CELL+30
      ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.fillStyle=colors[i];ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke()
    }
  }, [replay, replayFrame])

  useEffect(() => { if (!replay || !replay.length || replayFrame >= replay.length - 1) return; const t = setTimeout(() => setReplayFrame(f => f + 1), 100); return () => clearTimeout(t) }, [replay, replayFrame])

  const s = config.stats; const c = config.crystals
  const statUsed = s.atk + s.def + s.spd + s.hp
  const crystalUsed = c.fire + c.water + c.wind + c.earth

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{background:'#1a1a2e', color:'#888'}}>请先登录</div>

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{background:'#1a1a2e'}}>
      <h1 className="text-2xl font-bold text-center mt-4 mb-3" style={{color: '#58CC02'}}>⚔️ 匹配对战</h1>

      {status === 'idle' && (
        <div className="flex flex-wrap gap-4 justify-center">
          {/* 精灵选择 */}
          <div className="rounded-xl p-4 w-64" style={{background:'#262640'}}>
            <h3 className="text-xs font-bold mb-2" style={{color:'#58CC02'}}>🐉 选择精灵</h3>
            {pets.map(p => (
              <div key={p.id} onClick={() => setSelectedPet(p)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer"
                style={{background: selectedPet?.id === p.id ? '#33335e' : '#1e1e38'}}>
                <span style={{color:'#e0e0e0', fontSize:13}}>{p.name}</span>
                <span style={{color:'#888', fontSize:11, marginLeft:'auto'}}>Elo:{p.elo}</span>
              </div>
            ))}
          </div>
          {/* 配置面板 */}
          <div className="rounded-xl p-4 w-72" style={{background:'#262640'}}>
            <h3 className="text-xs font-bold mb-2" style={{color:'#FFD93D'}}>⚙️ 配置</h3>
            <div style={{fontSize:11, color:'#888', marginBottom:4}}>属性点 {totalStatPoints - statUsed}/{totalStatPoints}</div>
            {[['atk','⚔️ 攻击'],['def','🛡 防御'],['spd','💨 速度'],['hp','❤️ 血量']].map(([k,label]) => (
              <div key={k} className="flex items-center gap-1 mb-1" style={{fontSize:12}}>
                <span style={{color:'#aaa', width:50}}>{label}</span>
                <button onClick={() => adjStat(k,-1)} style={{width:20,height:20,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer',fontSize:13,lineHeight:'20px'}}>−</button>
                <span style={{color:'#e0e0e0',width:20,textAlign:'center',fontWeight:600}}>{s[k]}</span>
                <button onClick={() => adjStat(k,1)} style={{width:20,height:20,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer',fontSize:13,lineHeight:'20px'}}>+</button>
              </div>
            ))}
            <div style={{fontSize:11, color:'#888', marginTop:6, marginBottom:4}}>水晶 {totalCrystalPoints - crystalUsed}/{totalCrystalPoints}</div>
            {[['fire','🔥 火'],['water','🌊 水'],['wind','🌪️ 风'],['earth','⛰️ 地']].map(([k,label]) => (
              <div key={k} className="flex items-center gap-1 mb-1" style={{fontSize:12}}>
                <span style={{color:'#aaa', width:50}}>{label}</span>
                <button onClick={() => adjCrystal(k,-1)} style={{width:20,height:20,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer',fontSize:13,lineHeight:'20px'}}>−</button>
                <span style={{color:'#e0e0e0',width:20,textAlign:'center',fontWeight:600}}>{c[k]}</span>
                <button onClick={() => adjCrystal(k,1)} style={{width:20,height:20,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer',fontSize:13,lineHeight:'20px'}}>+</button>
              </div>
            ))}
            <div style={{fontSize:11, color:'#888', marginTop:6, marginBottom:4}}>技能</div>
            <div className="flex flex-wrap gap-1">
              {[['heal','💚治疗'],['blink','⚡闪现'],['rage','🔥狂暴'],['thorn','🌵荆棘'],['sense','👁️侦查']].map(([k,label]) => (
                <button key={k} onClick={() => setConfig({...config, skill: k})}
                  style={{padding:'2px 6px',border:`1px solid ${config.skill===k?'#58CC02':'#555'}`,borderRadius:6,background:config.skill===k?'rgba(88,204,2,0.1)':'#1e1e38',color:config.skill===k?'#58CC02':'#aaa',fontSize:10,cursor:'pointer'}}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={joinMatch} disabled={!selectedPet}
              className="w-full py-2 rounded-lg font-bold text-white text-xs mt-3"
              style={{background: selectedPet ? '#58CC02' : '#555', boxShadow: selectedPet ? '0 4px 0 #3d8a02' : 'none'}}>
              🔍 开始匹配
            </button>
          </div>
        </div>
      )}

      {status === 'waiting' && (
        <div className="text-center mt-8">
          <div style={{fontSize:48,marginBottom:16}}>🔍</div>
          <p style={{color:'#FFD93D',fontWeight:600,fontSize:16}}>匹配中...</p>
          <p style={{color:'#888',fontSize:13,marginTop:8}}>正在寻找对手</p>
          <button onClick={cancelMatch} className="mt-6 text-sm" style={{color:'#888'}}>取消匹配</button>
        </div>
      )}

      {status === 'matched' && result && (
        <>
          <div className="flex items-center gap-6 mb-3">
            <div className="text-center" style={{color:'#e0e0e0',fontWeight:600,fontSize:16}}>
              {selectedPet?.name}<div style={{color:'#58CC02',fontSize:24,fontWeight:700}}>{result.myKills}</div>
            </div>
            <div style={{color:'#555',fontSize:20}}>VS</div>
            <div className="text-center" style={{color:'#e0e0e0',fontWeight:600,fontSize:16}}>
              {result.opponentName}<div style={{color:'#58CC02',fontSize:24,fontWeight:700}}>{result.opponentKills}</div>
            </div>
          </div>
          <div style={{color:result.winner===selectedPet?.name?'#58CC02':'#FF4B4B',fontWeight:700,fontSize:18,marginBottom:8}}>
            {result.winner===selectedPet?.name?'🏆 胜利！':result.winner===result.opponentName?'💀 败北':'🤝 平局'}
          </div>
          <canvas ref={canvasRef} width={600} height={600} style={{imageRendering:'pixelated',border:'3px solid #333',borderRadius:8,background:'#2a2a3e'}} />
          <button onClick={() => setStatus('idle')} className="mt-4 px-8 py-3 rounded-xl font-bold text-white" style={{background:'#58CC02',boxShadow:'0 5px 0 #3d8a02',fontSize:16}}>🔄 再来一局</button>
        </>
      )}
      <button onClick={() => nav('/')} style={{color:'#666',fontSize:13,marginTop:16}}>← 返回</button>
    </div>
  )
}
