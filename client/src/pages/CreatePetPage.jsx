import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PET_TYPES = [
  { id: 'fire', name: '小火龙', color: '#FF6B6B', desc: '火属性，均衡型', skill: 'shield' },
  { id: 'water', name: '水灵灵', color: '#4ECDC4', desc: '水属性，防御型', skill: 'shield' },
  { id: 'thunder', name: '闪电鼠', color: '#FFD93D', desc: '雷属性，速攻型', skill: 'boost' },
  { id: 'wind', name: '风之翼', color: '#CE82FF', desc: '风属性，游击型', skill: 'cloak' },
  { id: 'earth', name: '石巨人', color: '#8B7355', desc: '地属性，坦克型', skill: 'shield' },
  { id: 'shadow', name: '暗影猫', color: '#666', desc: '暗属性，刺客型', skill: 'cloak' },
]

export default function CreatePetPage({ API, user }) {
  const [name, setName] = useState('')
  const [type, setType] = useState(PET_TYPES[0])
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const create = async () => {
    if (!name.trim() || !user) return
    setLoading(true)
    try {
      const r = await fetch(API + '/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), ownerId: user.id, petType: type.skill }),
      })
      const data = await r.json()
      alert(`✅ ${data.name} 诞生了！`)
      nav('/my-pets')
    } catch (e) {
      alert('创建失败')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{background: '#1a1a2e'}}>
      <h1 className="text-2xl font-bold mb-4 mt-4" style={{color: '#58CC02'}}>✨ 创建精灵</h1>

      <div className="mb-4 w-80">
        <p className="text-xs mb-2" style={{color: '#888'}}>精灵名字</p>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="给你的精灵取个名字"
          maxLength={10}
          className="w-full px-4 py-3 rounded-xl text-base outline-none"
          style={{background: '#262640', color: '#e0e0e0', border: '2px solid #333'}} />
      </div>

      <p className="text-xs mb-2" style={{color: '#888'}}>选择属性</p>
      <div className="grid grid-cols-2 gap-3 mb-6 w-80">
        {PET_TYPES.map(p => (
          <div key={p.id} onClick={() => setType(p)}
            className="flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer"
            style={{
              background: type.id === p.id ? p.color + '33' : '#1e1e38',
              border: type.id === p.id ? '2px solid ' + p.color : '2px solid #333',
            }}>
            <div className="w-4 h-4 rounded-full" style={{background: p.color}} />
            <div>
              <div style={{color: '#e0e0e0', fontSize: 13, fontWeight: 600}}>{p.name}</div>
              <div style={{color: '#888', fontSize: 10}}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={create} disabled={loading || !name.trim() || !user}
        className="w-80 py-3 rounded-xl font-bold text-white text-base mb-4"
        style={{background: loading ? '#555' : '#58CC02', boxShadow: '0 5px 0 #3d8a02'}}>
        {loading ? '⏳ 创造中...' : `🌟 创造 ${name || '精灵'}`}
      </button>

      <button onClick={() => nav('/')} style={{color: '#666', fontSize: 13}}>← 返回</button>
    </div>
  )
}
