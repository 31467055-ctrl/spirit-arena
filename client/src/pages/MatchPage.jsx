import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MatchPage({ API, user }) {
  const [status, setStatus] = useState('idle') // idle | waiting | matched | done
  const [pets, setPets] = useState([])
  const [selectedPet, setSelectedPet] = useState(null)
  const [result, setResult] = useState(null)
  const [replay, setReplay] = useState(null)
  const [replayFrame, setReplayFrame] = useState(0)
  const [matchLog, setMatchLog] = useState([])
  const canvasRef = useRef(null)
  const nav = useNavigate()
  const pollRef = useRef(null)

  useEffect(() => {
    if (!user) return
    fetch(API + '/api/pets?ownerId=' + user.id).then(r => r.json()).then(setPets)
  }, [user])

  // 加入匹配
  const joinMatch = async () => {
    if (!selectedPet) return
    setStatus('waiting')
    const r = await fetch(API + '/api/match/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, petId: selectedPet.id }),
    })
    const data = await r.json()
    if (data.matched) {
      onMatched(data)
    } else {
      // 开始轮询是否匹配到
      pollRef.current = setInterval(async () => {
        const sr = await fetch(API + '/api/match/status?userId=' + user.id)
        const sd = await sr.json()
        if (!sd.waiting) {
          clearInterval(pollRef.current)
          // 重新加入匹配（会被匹配到对手）
          const r2 = await fetch(API + '/api/match/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, petId: selectedPet.id }),
          })
          const data2 = await r2.json()
          if (data2.matched) onMatched(data2)
        }
      }, 2000)
    }
  }

  const onMatched = (data) => {
    setStatus('matched')
    setResult(data)
    setMatchLog(p => [data, ...p].slice(0, 20))
    // 获取回放
    fetch(API + '/api/matches/' + data.matchId + '/replay')
      .then(r => r.json())
      .then(rj => { setReplay(rj); setReplayFrame(0) })
  }

  const cancelMatch = async () => {
    clearInterval(pollRef.current)
    await fetch(API + '/api/match/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
    setStatus('idle')
  }

  // 回放渲染
  useEffect(() => {
    if (!replay || !replay.length || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const frame = replay[replayFrame]
    if (!frame) return
    const CELL = 60
    ctx.clearRect(0, 0, 600, 600)
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const px = x*CELL, py = y*CELL
      ctx.fillStyle = (x+y)%2===0 ? '#3a3a5c' : '#32325a'
      ctx.fillRect(px, py, CELL, CELL)
    }
    if(frame.s){ctx.font='30px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⭐',frame.s[0]*CELL+30,frame.s[1]*CELL+30)}
    const colors=['#FF6B6B','#4ECDC4']
    for(let i=0;i<2;i++){const pos=i===0?frame.p0:frame.p1;if(!pos)continue
      const [x,y,dir]=pos;const cx=x*CELL+30,cy=y*CELL+30
      ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.fillStyle=colors[i];ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke()
    }
  }, [replay, replayFrame])

  useEffect(() => {
    if (!replay || !replay.length) return
    if (replayFrame >= replay.length - 1) return
    const t = setTimeout(() => setReplayFrame(f => f + 1), 100)
    return () => clearTimeout(t)
  }, [replay, replayFrame])

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{background:'#1a1a2e', color:'#888'}}>请先登录</div>

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{background:'#1a1a2e'}}>
      <h1 className="text-2xl font-bold text-center mt-4 mb-4" style={{color: '#58CC02'}}>⚔️ 匹配对战</h1>

      {status === 'idle' && (
        <>
          <p className="text-sm mb-4" style={{color: '#888'}}>选择你的精灵，匹配其他训练师</p>
          {pets.length === 0 ? (
            <p style={{color: '#666'}}>你还没有精灵，先去创建一只吧</p>
          ) : (
            <div className="w-72 mb-4">
              {pets.map(p => (
                <div key={p.id} onClick={() => setSelectedPet(p)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2 cursor-pointer"
                  style={{background: selectedPet?.id === p.id ? '#33335e' : '#1e1e38'}}>
                  <div className="w-4 h-4 rounded-full" style={{background: p.skillType === 'shield' ? '#FF6B6B' : '#CE82FF'}} />
                  <div>
                    <div style={{color:'#e0e0e0', fontWeight:600, fontSize:14}}>{p.name}</div>
                    <div style={{color:'#888', fontSize:11}}>Elo:{p.elo} · {p.wins}胜</div>
                  </div>
                </div>
              ))}
              <button onClick={joinMatch} disabled={!selectedPet}
                className="w-full py-3 rounded-xl font-bold text-white text-base mt-2"
                style={{background: selectedPet ? '#58CC02' : '#555', boxShadow: selectedPet ? '0 5px 0 #3d8a02' : 'none'}}>
                🔍 开始匹配
              </button>
            </div>
          )}
        </>
      )}

      {status === 'waiting' && (
        <div className="text-center">
          <div style={{fontSize: 48, marginBottom: 16}}>🔍</div>
          <p style={{color: '#FFD93D', fontWeight: 600, fontSize: 16}}>匹配中...</p>
          <p style={{color: '#888', fontSize: 13, marginTop: 8}}>正在寻找对手，请稍等</p>
          <button onClick={cancelMatch} className="mt-6 text-sm" style={{color: '#888'}}>取消匹配</button>
        </div>
      )}

      {status === 'matched' && result && (
        <>
          <div className="flex items-center gap-6 mb-3">
            <div className="text-center" style={{color:'#e0e0e0', fontWeight:600, fontSize:16}}>
              {selectedPet?.name}
              <div style={{color:'#58CC02', fontSize:24, fontWeight:700}}>{result.myKills}</div>
            </div>
            <div style={{color:'#555', fontSize:20}}>VS</div>
            <div className="text-center" style={{color:'#e0e0e0', fontWeight:600, fontSize:16}}>
              {result.opponentName}
              <div style={{color:'#58CC02', fontSize:24, fontWeight:700}}>{result.opponentKills}</div>
            </div>
          </div>
          <div style={{color: result.winner === selectedPet?.name ? '#58CC02' : '#FF4B4B', fontWeight:700, fontSize:18, marginBottom:8}}>
            {result.winner === selectedPet?.name ? '🏆 胜利！' : result.winner === result.opponentName ? '💀 败北' : '🤝 平局'}
          </div>
          <div className="rounded-xl" style={{background:'#262640', boxShadow:'0 4px 0 rgba(0,0,0,0.3)'}}>
            <canvas ref={canvasRef} width={600} height={600} className="rounded-lg"
              style={{imageRendering:'pixelated', border:'3px solid #333', display:'block'}} />
          </div>
          <button onClick={() => setStatus('idle')} className="mt-4 px-8 py-3 rounded-xl font-bold text-white"
            style={{background:'#58CC02', boxShadow:'0 5px 0 #3d8a02', fontSize:16}}>
            🔄 再来一局
          </button>
        </>
      )}

      <button onClick={() => nav('/')} style={{color:'#666', fontSize:13, marginTop:16}}>← 返回</button>
    </div>
  )
}
