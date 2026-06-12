import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ORDER = ['fire', 'water', 'wind', 'earth']
const TOTAL_STAT = 15, TOTAL_CRYSTAL = 10

export default function CreatePetPage({ API, user }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ atk: 0, def: 0, spd: 0, hp: 0 })
  const [crystals, setCrystals] = useState({ fire: 0, water: 0, wind: 0, earth: 0 })
  const [skill, setSkill] = useState('heal')
  const nav = useNavigate()

  const adjStat = (k, d) => setStats(p => {
    const s = { ...p }; const u = s.atk + s.def + s.spd + s.hp
    if (d > 0 && u >= TOTAL_STAT) return p; if (d < 0 && s[k] <= 0) return p
    s[k] += d; return s
  })

  const adjCrystal = (k, d) => setCrystals(p => {
    const c = { ...p }; const u = c.fire + c.water + c.wind + c.earth
    if (d > 0 && u >= TOTAL_CRYSTAL) return p; if (d < 0 && c[k] <= 0) return p
    if (d > 0 && c[k] === 0) {
      const active = ORDER.filter(x => c[x] > 0)
      if (active.length >= 2) {
        const idx = ORDER.indexOf(k)
        const ok = active.some(x => { const xi = ORDER.indexOf(x); return (idx+1)%4 === xi || (idx+3)%4 === xi })
        if (!ok) return p
      }
    }
    c[k] += d; return c
  })

  const create = async () => {
    if (!name.trim() || !user) return
    setLoading(true)
    try {
      const r = await fetch(API + '/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), ownerId: user.id, petType: 'custom' }),
      })
      const data = await r.json()
      alert(`✅ ${data.name} 诞生了！去匹配对战吧！`)
      nav('/match')
    } catch (e) { alert('创建失败') }
    setLoading(false)
  }

  const su = stats.atk + stats.def + stats.spd + stats.hp
  const cu = crystals.fire + crystals.water + crystals.wind + crystals.earth
  const skillList = [['heal','💚治疗波'],['blink','⚡闪现'],['rage','🔥狂暴'],['thorn','🌵荆棘甲'],['sense','👁️侦查']]

  return (
    <div className="min-h-screen p-4" style={{background:'#1a1a2e'}}>
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-center mt-4 mb-4" style={{color:'#58CC02'}}>✨ 创建精灵</h1>

        <div className="rounded-xl p-4 mb-3" style={{background:'#262640'}}>
          <p className="text-xs mb-2" style={{color:'#888'}}>精灵名字</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="给你的精灵取个名字" maxLength={10}
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={{background:'#1e1e38', color:'#e0e0e0', border:'2px solid #333'}} />
        </div>

        <div className="rounded-xl p-4 mb-3" style={{background:'#262640'}}>
          <h3 className="text-xs font-bold mb-2" style={{color:'#FFD93D'}}>⚔️ 属性点 ({TOTAL_STAT - su}/{TOTAL_STAT})</h3>
          {[['atk','⚔️ 攻击'],['def','🛡 防御'],['spd','💨 速度'],['hp','❤️ 血量']].map(([k,label]) => (
            <div key={k} className="flex items-center gap-2 mb-1" style={{fontSize:13}}>
              <span style={{color:'#aaa', width:50}}>{label}</span>
              <button onClick={() => adjStat(k,-1)} style={{width:24,height:24,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer'}}>−</button>
              <span style={{color:'#e0e0e0',width:24,textAlign:'center',fontWeight:700}}>{stats[k]}</span>
              <button onClick={() => adjStat(k,1)} style={{width:24,height:24,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer'}}>+</button>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-3" style={{background:'#262640'}}>
          <h3 className="text-xs font-bold mb-2" style={{color:'#4ECDC4'}}>💎 水晶 ({TOTAL_CRYSTAL - cu}/{TOTAL_CRYSTAL})</h3>
          <p className="text-xs mb-2" style={{color:'#666'}}>火→水→风→地→火，仅相邻可混合</p>
          {[['fire','🔥 火'],['water','🌊 水'],['wind','🌪️ 风'],['earth','⛰️ 地']].map(([k,label]) => (
            <div key={k} className="flex items-center gap-2 mb-1" style={{fontSize:13}}>
              <span style={{color:'#aaa', width:50}}>{label}</span>
              <button onClick={() => adjCrystal(k,-1)} style={{width:24,height:24,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer'}}>−</button>
              <span style={{color:'#e0e0e0',width:24,textAlign:'center',fontWeight:700}}>{crystals[k]}</span>
              <button onClick={() => adjCrystal(k,1)} style={{width:24,height:24,border:'none',borderRadius:4,background:'#4B4B6E',color:'#fff',cursor:'pointer'}}>+</button>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-4" style={{background:'#262640'}}>
          <h3 className="text-xs font-bold mb-2" style={{color:'#CE82FF'}}>🛡 技能</h3>
          <div className="flex flex-wrap gap-2">
            {skillList.map(([k,label]) => (
              <button key={k} onClick={() => setSkill(k)}
                style={{padding:'4px 10px',border:`1.5px solid ${skill===k?'#CE82FF':'#555'}`,borderRadius:8,background:skill===k?'rgba(206,130,255,0.15)':'#1e1e38',color:skill===k?'#CE82FF':'#aaa',fontSize:12,cursor:'pointer'}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={create} disabled={loading || !name.trim() || !user}
          className="w-full py-3 rounded-xl font-bold text-white text-base mb-4"
          style={{background:loading?'#555':'#58CC02', boxShadow:'0 5px 0 #3d8a02'}}>
          {loading ? '⏳ 创造中...' : `🌟 创造 ${name || '精灵'}`}
        </button>
        <button onClick={() => nav('/')} style={{color:'#666', fontSize:13, display:'block', margin:'0 auto'}}>← 返回</button>
      </div>
    </div>
  )
}
