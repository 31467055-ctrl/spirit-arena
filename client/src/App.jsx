import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const API = import.meta.env.VITE_API_URL || ''
  const [pets, setPets] = useState([])
  const [matchLog, setMatchLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [battleId, setBattleId] = useState(null)
  const canvasRef = useRef(null)
  const replayRef = useRef(null)
  const frameRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => {
    fetch(API + '/api/pets').then(r => r.json()).then(setPets)
  }, [])

  // 独立的渲染循环
  const drawFrame = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return setTimeout(drawFrame, 50)
    const ctx = canvas.getContext('2d')
    const replay = replayRef.current
    if (!replay || !replay.length) return

    const frame = replay[frameRef.current]
    if (!frame) return

    const CELL = 60 // 600/10
    ctx.clearRect(0, 0, 600, 600)

    // 地图 - 完整纹理
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const px = x * CELL, py = y * CELL
        // 固定地图墙壁位置
        const isWall = (x===0&&y===2)||(x===0&&y===7)||(x===2&&y===0)||(x===2&&y===3)||
                       (x===2&&y===6)||(x===2&&y===9)||(x===3&&y===1)||(x===3&&y===8)||
                       (x===6&&y===1)||(x===6&&y===8)||(x===7&&y===0)||(x===7&&y===3)||
                       (x===7&&y===6)||(x===7&&y===9)||(x===9&&y===2)||(x===9&&y===7)
        const isGrass = (x===1&&y===4)||(x===1&&y===5)||(x===3&&y===1)||(x===3&&y===8)||
                       (x===6&&y===1)||(x===6&&y===8)||(x===8&&y===4)||(x===8&&y===5)
        if (isWall) {
          ctx.fillStyle = '#5c4033'
          ctx.fillRect(px, py, CELL, CELL)
          ctx.fillStyle = '#7a5a44'
          ctx.fillRect(px+2, py+2, CELL-4, CELL-4)
          ctx.fillStyle = '#4a3020'
          ctx.fillRect(px+6, py+6, 4, 4)
          ctx.fillRect(px+28, py+28, 4, 4)
        } else if ((x===1&&y===4)||(x===1&&y===5)||(x===3&&y===1)||(x===3&&y===8)||
                   (x===6&&y===1)||(x===6&&y===8)||(x===8&&y===4)||(x===8&&y===5)) {
          ctx.fillStyle = '#2d5a27'
          ctx.fillRect(px, py, CELL, CELL)
          ctx.fillStyle = '#3a7a33'
          ctx.fillRect(px+6, py+6, 6, 6)
          ctx.fillRect(px+22, py+22, 5, 5)
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#3a3a5c' : '#32325a'
          ctx.fillRect(px, py, CELL, CELL)
        }
      }
    }

    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,600); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(600,i*CELL); ctx.stroke()
    }

    // 星尘
    if (frame.s) {
      const pulse = Math.sin(Date.now() * 0.005) * 2
      ctx.font = '22px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⭐', frame.s[0]*CELL+20, frame.s[1]*CELL+20 + pulse)
    }

    // 子弹
    if (frame.b) {
      for (const b of frame.b) {
        ctx.beginPath()
        ctx.arc(b.x*CELL+20, b.y*CELL+20, 5, 0, Math.PI*2)
        ctx.fillStyle = '#FFD93D'
        ctx.shadowColor = '#FFD93D'
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // 精灵
    const colors = ['#FF6B6B', '#4ECDC4']
    const names = ['小火龙', '水灵灵']
    for (let i = 0; i < 2; i++) {
      const pos = i === 0 ? frame.p0 : frame.p1
      if (!pos) continue
      const [x, y, dir] = pos
      const cx = x * CELL + 20, cy = y * CELL + 20

      ctx.save()

      // 护盾光环
      if (frame.shield && frame.shield[i]) {
        ctx.beginPath()
        ctx.arc(cx, cy, 18, 0, Math.PI*2)
        ctx.strokeStyle = '#58CC02'
        ctx.lineWidth = 3
        ctx.shadowColor = '#58CC02'
        ctx.shadowBlur = 18
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // 身体
      ctx.beginPath()
      ctx.arc(cx, cy, 14, 0, Math.PI*2)
      ctx.fillStyle = colors[i]
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // 方向三角
      const angle = (dir || 0) * Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle)*18, cy + Math.sin(angle)*18)
      ctx.lineTo(cx + Math.cos(angle+2.5)*11, cy + Math.sin(angle+2.5)*11)
      ctx.lineTo(cx + Math.cos(angle-2.5)*11, cy + Math.sin(angle-2.5)*11)
      ctx.closePath()
      ctx.fillStyle = '#fff'
      ctx.fill()

      ctx.restore()

      // 名字
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(names[i], cx, cy - 24)

      // 击杀数
      const kills = i === 0 ? (frame.k0 || 0) : (frame.k1 || 0)
      ctx.fillStyle = '#FFD93D'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('💀' + kills, cx, cy + 26)

      // buff标签
      let tags = []
      if (frame.shield && frame.shield[i]) tags.push('🛡')
      if (tags.length) {
        ctx.font = '10px sans-serif'
        ctx.fillStyle = '#888'
        ctx.fillText(tags.join(' '), cx, cy + 38)
      }
    }

    // 帧计数
    ctx.fillStyle = '#888'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`帧 ${frameRef.current+1}/${replay.length}`, 590, 20)

    // 更新比分DOM
    const k0el = document.getElementById('k0')
    const k1el = document.getElementById('k1')
    if (k0el && frame.k0 !== undefined) k0el.textContent = '💀' + frame.k0
    if (k1el && frame.k1 !== undefined) k1el.textContent = '💀' + frame.k1
  }

  // 帧推进
  useEffect(() => {
    if (!replayRef.current || !replayRef.current.length) return
    let active = true
    const advance = () => {
      if (!active) return
      if (frameRef.current < replayRef.current.length - 1) {
        frameRef.current++
        drawFrame()
        timerRef.current = setTimeout(advance, 100)
      } else {
        // 回放结束
        replayRef.current = null
        frameRef.current = 0
      }
    }
    timerRef.current = setTimeout(advance, 100)
    return () => { active = false; clearTimeout(timerRef.current) }
  }, [battleId])

  const fight = async () => {
    setLoading(true)
    const r = await fetch(API + '/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengerId: 'pet-dragon', defenderId: 'pet-sprite' }),
    })
    const data = await r.json()
    setLoading(false)

    // 获取回放
    const replayData = await fetch(API + '/api/matches/' + data.matchId + '/replay')
    const replayJson = await replayData.json()
    replayRef.current = replayJson
    frameRef.current = 0
    setBattleId(data.matchId)
    drawFrame()
    
    // 等回放播完再显示结果
    const totalFrames = replayJson.length
    const waitMs = totalFrames * 100 + 500
    setTimeout(() => {
      setMatchLog(prev => [data, ...prev].slice(0, 20))
    }, waitMs)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{background: '#1a1a2e'}}>
      {/* 标题 */}
      <h1 className="text-2xl font-bold text-center" style={{color: '#58CC02'}}>
        🧙 精灵决斗场
      </h1>
      <p className="text-center text-xs mb-3" style={{color: '#666'}}>
        AI自动对战 · 先到3杀获胜 · 45秒限时
      </p>

      {/* 比分栏 */}
      <div className="flex items-center gap-6 mb-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{background: '#1e1e38'}}>
          <div className="w-3 h-3 rounded-full" style={{background: '#FF6B6B'}} />
          <span style={{color: '#e0e0e0', fontWeight: 600, fontSize: 14}}>小火龙</span>
          <span style={{color: '#FFD93D', fontWeight: 700, fontSize: 18}} id="k0">💀0</span>
        </div>
        <span style={{color: '#666', fontSize: 20}}>VS</span>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{background: '#1e1e38'}}>
          <span style={{color: '#FFD93D', fontWeight: 700, fontSize: 18}} id="k1">💀0</span>
          <span style={{color: '#e0e0e0', fontWeight: 600, fontSize: 14}}>水灵灵</span>
          <div className="w-3 h-3 rounded-full" style={{background: '#4ECDC4'}} />
        </div>
      </div>

      {/* 游戏画面 */}
      <div className="rounded-xl" style={{background: '#262640', boxShadow: '0 4px 0 rgba(0,0,0,0.3)'}}>
        <canvas ref={canvasRef} width={600} height={600}
          className="rounded-lg"
          style={{imageRendering: 'pixelated', border: '3px solid #333', display: 'block'}}
        />
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={fight}
          disabled={loading}
          className="px-6 py-2 rounded-lg font-bold text-white text-sm"
          style={{background: loading ? '#555' : '#58CC02', boxShadow: '0 4px 0 #3d8a02'}}
        >
          {loading ? '⏳ 战斗中...' : '⚔️ 开始对战'}
        </button>
        {matchLog.length > 0 && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{background: '#1e1e38', color: '#aaa'}}>
            上局：{matchLog[0].winner
              ? <span style={{color: '#58CC02'}}>🏆 {matchLog[0].winner}</span>
              : <span>🤝 平局</span>
            } ({matchLog[0].challengerKills}-{matchLog[0].defenderKills})
          </div>
        )}
      </div>

      {/* 对战记录 */}
      {matchLog.length > 1 && (
        <div className="mt-3 max-h-32 overflow-y-auto text-xs px-3 py-2 rounded-lg" style={{background: '#1e1e38', color: '#888', width: 400}}>
          {matchLog.slice(1).map((m, i) => (
            <div key={i} className="py-1" style={{borderBottom: i < matchLog.length-2 ? '1px solid #2a2a3e' : 'none'}}>
              {m.winner ? <span style={{color: '#58CC02'}}>🏆 {m.winner}</span> : <span>🤝 平局</span>}
              <span style={{color: '#666'}}> ({m.challengerKills}-{m.defenderKills})</span>
            </div>
          ))}
        </div>
      )}

      {/* 用ref更新比分 */}
      <div style={{display: 'none'}}>{/* 比分通过DOM更新 */}</div>
    </div>
  )
  }
  
  export default App
