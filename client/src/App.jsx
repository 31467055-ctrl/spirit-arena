import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import BattlePage from './pages/BattlePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CreatePetPage from './pages/CreatePetPage.jsx'
import MyPetsPage from './pages/MyPetsPage.jsx'
import HelpPage from './pages/HelpPage.jsx'

const API = import.meta.env.VITE_API_URL || ''

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('spirit_user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  return (
    <Routes>
      <Route path="/" element={
        user ? <MainMenu user={user} onLogout={() => { setUser(null); localStorage.removeItem('spirit_user') }} />
             : <LoginPage onLogin={(u) => { setUser(u); localStorage.setItem('spirit_user', JSON.stringify(u)) }} />
      } />
      <Route path="/battle" element={<BattlePage API={API} />} />
      <Route path="/create-pet" element={<CreatePetPage API={API} user={user} />} />
      <Route path="/my-pets" element={<MyPetsPage API={API} user={user} />} />
      <Route path="/help" element={<HelpPage />} />
    </Routes>
  )
}

function MainMenu({ user, onLogout }) {
  const nav = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{background: '#1a1a2e'}}>
      <h1 className="text-3xl font-bold mb-1" style={{color: '#58CC02'}}>精灵决斗场</h1>
      <p className="text-sm mb-6" style={{color: '#666'}}>欢迎回来，{user?.username}</p>

      <div className="flex flex-col gap-3 w-64">
        <button onClick={() => nav('/battle')}
          className="w-full py-3 rounded-xl font-bold text-white text-base"
          style={{background: '#58CC02', boxShadow: '0 5px 0 #3d8a02'}}>
          ⚔️ 观看对战
        </button>
        <button onClick={() => nav('/my-pets')}
          className="w-full py-3 rounded-xl font-bold text-white text-base"
          style={{background: '#4B4B6E', boxShadow: '0 5px 0 #333'}}>
          🐉 我的精灵
        </button>
        <button onClick={() => nav('/create-pet')}
          className="w-full py-3 rounded-xl font-bold text-white text-base"
          style={{background: '#CE82FF', boxShadow: '0 5px 0 #9a5fd6'}}>
          ✨ 创建精灵
        </button>
        <button onClick={() => nav('/help')}
          className="w-full py-2 rounded-lg text-sm"
          style={{color: '#888'}}>
          📖 游戏指南
        </button>
        <button onClick={onLogout}
          className="w-full py-2 rounded-lg text-sm"
          style={{color: '#666'}}>
          退出登录
        </button>
      </div>
    </div>
  )
}

export default App
