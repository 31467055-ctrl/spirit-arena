import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function BattlePage({ API }) {
  const [pets, setPets] = useState([])
  const [matchLog, setMatchLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [battleId, setBattleId] = useState(null)
  const canvasRef = useRef(null)
  const replayRef = useRef(null)
  const frameRef = useRef(0)
  const timerRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    fetch(API + '/api/pets').then(r => r.json()).then(setPets)
  }, [])

  const drawFrame = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const replay = replayRef.current
    if (!replay || !replay.length) return
    const frame = replay[frameRef.current]
    if (!frame) return
    const CELL = 60
    ctx.clearRect(0, 0, 600, 600)
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const px = x*CELL, py = y*CELL
      const isWall = (x===0&&y===2)||(x===0&&y===7)||(x===2&&y===0)||(x===2&&y===3)||(x===2&&y===6)||(x===2&&y===9)||(x===3&&y===1)||(x===3&&y===8)||(x===6&&y===1)||(x===6&&y===8)||(x===7&&y===0)||(x===7&&y===3)||(x===7&&y===6)||(x===7&&y===9)||(x===9&&y===2)||(x===9&&y===7)
      const isGrass = (x===1&&y===4)||(x===1&&y===5)||(x===3&&y===1)||(x===3&&y===8)||(x===6&&y===1)||(x===6&&y===8)||(x===8&&y===4)||(x===8&&y===5)
      if (isWall) {
        ctx.fillStyle='#5c4033'; ctx.fillRect(px,py,CELL,CELL)
        ctx.fillStyle='#7a5a44'; ctx.fillRect(px+2,py+2,CELL-4,CELL-4)
        ctx.fillStyle='#4a3020'; ctx.fillRect(px+6,py+6,4,4); ctx.fillRect(px+28,py+28,4,4)
      } else if (isGrass) {
        ctx.fillStyle='#2d5a27'; ctx.fillRect(px,py,CELL,CELL)
        ctx.fillStyle='#3a7a33'; ctx.fillRect(px+6,py+6,6,6); ctx.fillRect(px+22,py+22,5,5)
      } else {
        ctx.fillStyle=(x+y)%2===0?'#3a3a5c':'#32325a'; ctx.fillRect(px,py,CELL,CELL)
      }
    }
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
    for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(i*CELL,0);ctx.lineTo(i*CELL,600);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*CELL);ctx.lineTo(600,i*CELL);ctx.stroke()}
    if(frame.s){const p=Math.sin(Date.now()*0.005)*2;ctx.font='30px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⭐',frame.s[0]*CELL+30,frame.s[1]*CELL+30+p)}
    if(frame.b){for(const b of frame.b){ctx.beginPath();ctx.arc(b.x*CELL+30,b.y*CELL+30,7,0,Math.PI*2);ctx.fillStyle='#FFD93D';ctx.shadowColor='#FFD93D';ctx.shadowBlur=15;ctx.fill();ctx.shadowBlur=0}}
    const colors=['#FF6B6B','#4ECDC4'];const names=['小火龙','水灵灵']
    for(let i=0;i<2;i++){const pos=i===0?frame.p0:frame.p1;if(!pos)continue
      const [x,y,dir]=pos;const cx=x*CELL+30,cy=y*CELL+30
      if(frame.shield&&frame.shield[i]){ctx.beginPath();ctx.arc(cx,cy,26,0,Math.PI*2);ctx.strokeStyle='#58CC02';ctx.lineWidth=4;ctx.shadowColor='#58CC02';ctx.shadowBlur=25;ctx.stroke();ctx.shadowBlur=0}
      ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.fillStyle=colors[i];ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke()
      const angle=(dir||0)*Math.PI/2;ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*26,cy+Math.sin(angle)*26);ctx.lineTo(cx+Math.cos(angle+2.5)*16,cy+Math.sin(angle+2.5)*16);ctx.lineTo(cx+Math.cos(angle-2.5)*16,cy+Math.sin(angle-2.5)*16);ctx.closePath();ctx.fillStyle='#fff';ctx.fill()
      ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(names[i],cx,cy-34)
      const kills=i===0?(frame.k0||0):(frame.k1||0);ctx.fillStyle='#FFD93D';ctx.font='bold 14px sans-serif';ctx.fillText('💀'+kills,cx,cy+36)
      let tags=[];if(frame.shield&&frame.shield[i])tags.push('🛡');if(tags.length){ctx.font='12px sans-serif';ctx.fillStyle='#888';ctx.fillText(tags.join(' '),cx,cy+52)}
    }
    const k0=document.getElementById('k0');const k1=document.getElementById('k1')
    if(k0&&frame.k0!==undefined)k0.textContent='💀'+frame.k0;if(k1&&frame.k1!==undefined)k1.textContent='💀'+frame.k1
  }

  useEffect(() => {
    if(!replayRef.current||!replayRef.current.length)return
    let active=true
    const advance=()=>{if(!active)return;if(frameRef.current<replayRef.current.length-1){frameRef.current++;drawFrame();timerRef.current=setTimeout(advance,100)}else{replayRef.current=null;frameRef.current=0}}
    timerRef.current=setTimeout(advance,100)
    return()=>{active=false;clearTimeout(timerRef.current)}
  },[battleId])

  const fight=async()=>{
    setLoading(true)
    const r=await fetch(API+'/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengerId:'pet-dragon',defenderId:'pet-sprite'})})
    const data=await r.json();setLoading(false)
    const rd=await fetch(API+'/api/matches/'+data.matchId+'/replay');const rj=await rd.json()
    replayRef.current=rj;frameRef.current=0;setBattleId(data.matchId);drawFrame()
    setTimeout(()=>{setMatchLog(p=>[data,...p].slice(0,20))},rj.length*100+500)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{background:'#1a1a2e'}}>
      <h1 className="text-3xl font-bold text-center mb-1" style={{color:'#58CC02'}}>精灵决斗场</h1>
      <p className="text-center text-sm mb-3" style={{color:'#666'}}>AI自动对战 · 先到3杀获胜 · 45秒限时</p>
      <div className="flex items-center gap-8 mb-3">
        <div className="flex items-center gap-3 px-6 py-3 rounded-lg" style={{background:'#1e1e38'}}>
          <div className="w-5 h-5 rounded-full" style={{background:'#FF6B6B'}}/>
          <span style={{color:'#e0e0e0',fontWeight:600,fontSize:18}}>小火龙</span>
          <span style={{color:'#FFD93D',fontWeight:700,fontSize:26}} id="k0">💀0</span>
        </div>
        <span style={{color:'#555',fontSize:28,fontWeight:600}}>VS</span>
        <div className="flex items-center gap-3 px-6 py-3 rounded-lg" style={{background:'#1e1e38'}}>
          <span style={{color:'#FFD93D',fontWeight:700,fontSize:26}} id="k1">💀0</span>
          <span style={{color:'#e0e0e0',fontWeight:600,fontSize:18}}>水灵灵</span>
          <div className="w-5 h-5 rounded-full" style={{background:'#4ECDC4'}}/>
        </div>
      </div>
      <div className="rounded-xl" style={{background:'#262640',boxShadow:'0 4px 0 rgba(0,0,0,0.3)'}}>
        <canvas ref={canvasRef} width={600} height={600} className="rounded-lg" style={{imageRendering:'pixelated',border:'3px solid #333',display:'block'}}/>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <button onClick={fight} disabled={loading}
          className="font-bold text-white rounded-xl"
          style={{background:loading?'#555':'#58CC02',boxShadow:'0 6px 0 #3d8a02',fontSize:22,padding:'14px 48px'}}>
          {loading?'⏳ 战斗中...':'⚔️ 开始对战'}</button>
        {matchLog.length>0&&(
          <div className="text-sm px-4 py-2 rounded-lg" style={{background:'#1e1e38',color:'#aaa'}}>
            上局：{matchLog[0].winner?<span style={{color:'#58CC02'}}>🏆{matchLog[0].winner}</span>:<span>🤝平局</span>}
            ({matchLog[0].challengerKills}-{matchLog[0].defenderKills})
          </div>
        )}
      </div>
      {matchLog.length>1&&(
        <div className="mt-3 max-h-32 overflow-y-auto text-xs px-3 py-2 rounded-lg" style={{background:'#1e1e38',color:'#888',width:400}}>
          {matchLog.slice(1).map((m,i)=>(
            <div key={i} className="py-1" style={{borderBottom:i<matchLog.length-2?'1px solid #2a2a3e':'none'}}>
              {m.winner?<span style={{color:'#58CC02'}}>🏆{m.winner}</span>:<span>🤝平局</span>}
              <span style={{color:'#666'}}> ({m.challengerKills}-{m.defenderKills})</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={()=>nav('/')} style={{color:'#666',fontSize:13,marginTop:12}}>← 返回</button>
    </div>
  )
}
