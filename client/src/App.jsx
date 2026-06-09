import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [pets, setPets] = useState([])
  const [matchLog, setMatchLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [battleId, setBattleId] = useState(null)
  const canvasRef = useRef(null)
  const replayRef = useRef(null)
  const frameRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => {
    fetch('/api/pets').then(r => r.json()).then(setPets)
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

    const CELL = 40
    ctx.clearRect(0, 0, 400, 400)

    // 地图
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#3a3a5c' : '#32325a'
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
    }

    // 墙壁
    const walls = [[0,2],[0,7],[2,0],[2,3],[2,6],[2,9],[3,1],[3,8],[6,1],[6,8],[7,0],[7,3],[7,6],[7,9],[9,2],[9,7]]
    for (const [x, y] of walls) {
      ctx.fillStyle = '#5c4033'
      ctx.fillRect(x*CELL, y*CELL, CELL, CELL)
      ctx.fillStyle = '#7a5a44'
      ctx.fillRect(x*CELL+2, y*CELL+2, CELL-4, CELL-4)
    }

    // 星尘
    if (frame.s) {
      ctx.font = '20px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⭐', frame.s[0]*CELL+20, frame.s[1]*CELL+20)
    }

    // 精灵
    const colors = ['#FF6B6B', '#4ECDC4']
    const names = ['小火龙', '水灵灵']
    for (let i = 0; i < 2; i++) {
      const pos = i === 0 ? frame.p0 : frame.p1
      if (!pos) continue
      const [x, y, dir] = pos
      const cx = x * CELL + 20, cy = y * CELL + 20

      // 护盾
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

      // 方向
      const angle = (dir || 0) * Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle)*18, cy + Math.sin(angle)*18)
      ctx.lineTo(cx + Math.cos(angle+2.5)*11, cy + Math.sin(angle+2.5)*11)
      ctx.lineTo(cx + Math.cos(angle-2.5)*11, cy + Math.sin(angle-2.5)*11)
      ctx.closePath()
      ctx.fillStyle = '#fff'
      ctx.fill()

      // 名字
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(names[i], cx, cy-24)

      // 击杀数
      const kills = i === 0 ? (frame.k0 || 0) : (frame.k1 || 0)
      ctx.fillStyle = '#FFD93D'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('💀'+kills, cx, cy+26)
    }

    // 子弹
    if (frame.b) {
      ctx.fillStyle = '#FFD93D'
      ctx.shadowColor = '#FFD93D'
      ctx.shadowBlur = 12
      for (const b of frame.b) {
        ctx.beginPath()
        ctx.arc(b.x*CELL+20, b.y*CELL+20, 5, 0, Math.PI*2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    // 帧计数
    ctx.fillStyle = '#888'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`帧 ${frameRef.current+1}/${replay.length}`, 390, 15)
  }

  // 帧推进
  useEffect(() => {
    if (!replayRef.current || !replayRef.current.length) return
    const advance = () => {
      if (frameRef.current < replayRef.current.length - 1) {
        frameRef.current++
        drawFrame()
        timerRef.current = setTimeout(advance, 100)
      }
    }
    timerRef.current = setTimeout(advance, 100)
    return () => clearTimeout(timerRef.current)
  }, [battleId])

  const fight = async () => {
    setLoading(true)
    const r = await fetch('/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengerId: 'pet-dragon', defenderId: 'pet-sprite' }),
    })
    const data = await r.json()
    setMatchLog(prev => [data, ...prev].slice(0, 20))
    setLoading(false)

    // 获取回放
    const replayData = await fetch('/api/matches/' + data.matchId + '/replay')
    const replayJson = await replayData.json()
    replayRef.current = replayJson
    frameRef.current = 0
    setBattleId(data.matchId)
    drawFrame()
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-1" style={{color: '#58CC02'}}>
          🧙 精灵决斗场
        </h1>
        <p className="text-center text-sm text-gray-500 mb-4">
          AI自动对战 · 先到3杀获胜 · 45秒限时
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <div className="bg-white rounded-xl shadow-md p-4 w-64">
            <h2 className="font-bold text-sm mb-3" style={{color: '#58CC02'}}>⚔️ 对战</h2>
            <div className="space-y-2 mb-4">
              {pets.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <div className="w-3 h-3 rounded-full" style={{
                    background: i === 0 ? '#FF6B6B' : '#4ECDC4'
                  }} />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">Elo:{p.elo}</span>
                </div>
              ))}
            </div>

            <button
              onClick={fight}
              disabled={loading}
              className="w-full py-2 rounded-lg font-bold text-white text-sm"
              style={{background: loading ? '#999' : '#58CC02', boxShadow: '0 4px 0 #3d8a02'}}
            >
              {loading ? '⏳ 战斗中...' : '⚔️ 开始对战'}
            </button>

            <div className="mt-4 max-h-40 overflow-y-auto text-xs">
              {matchLog.map((m, i) => (
                <div key={i} className="py-1 border-b border-gray-100 last:border-0">
                  {m.winner
                    ? <span className="text-green-600">🏆 {m.winner} 获胜</span>
                    : <span className="text-gray-500">🤝 平局</span>
                  }
                  <span className="text-gray-400 ml-2">({m.challengerKills}-{m.defenderKills})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <canvas ref={canvasRef} width={400} height={400}
              className="border-2 border-gray-200 rounded-lg"
              style={{imageRendering: 'pixelated'}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
