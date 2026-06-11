import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const login = async () => {
    if (!username.trim()) return
    setLoading(true)
    try {
      const r = await fetch(API + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })
      const data = await r.json()
      onLogin(data)
      nav('/')
    } catch (e) {
      alert('连接失败，请稍后重试')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{background: '#1a1a2e'}}>
      <div style={{fontSize: 48, marginBottom: 8}}>🧙</div>
      <h1 className="text-3xl font-bold mb-1" style={{color: '#58CC02'}}>精灵决斗场</h1>
      <p className="text-sm mb-6" style={{color: '#666'}}>输入昵称即可开始</p>

      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
        placeholder="你的昵称"
        maxLength={12}
        className="w-64 px-4 py-3 rounded-xl text-base outline-none mb-3"
        style={{background: '#262640', color: '#e0e0e0', border: '2px solid #333'}}
      />

      <button onClick={login} disabled={loading || !username.trim()}
        className="w-64 py-3 rounded-xl font-bold text-white text-base"
        style={{background: loading ? '#555' : '#58CC02', boxShadow: '0 5px 0 #3d8a02'}}>
        {loading ? '⏳ 进入中...' : '🎮 进入游戏'}
      </button>
    </div>
  )
}
