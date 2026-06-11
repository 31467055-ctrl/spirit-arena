import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MyPetsPage({ API, user }) {
  const [pets, setPets] = useState([])
  const [selected, setSelected] = useState(null)
  const [code, setCode] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    if (!user) return
    fetch(API + '/api/pets?ownerId=' + user.id).then(r => r.json()).then(setPets)
  }, [user])

  const selectPet = async (pet) => {
    setSelected(pet)
    const r = await fetch(API + '/api/pets/' + pet.id)
    const data = await r.json()
    setCode(data.code || '')
  }

  const saveCode = async () => {
    if (!selected) return
    await fetch(API + '/api/pets/' + selected.id + '/code', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    alert('✅ 脚本已更新')
  }

  const saveApiKey = async () => {
    if (!apiKeyInput || !user) return
    await fetch(API + '/api/users/' + user.id + '/apikey', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKeyInput }),
    })
    alert('✅ API Key 已保存')
  }

  const generateWithAI = async () => {
    const prompt = document.getElementById('aiPrompt')?.value
    const status = document.getElementById('aiStatus')
    if (!prompt || !selected || !user) {
      if (status) status.textContent = '⚠️ 请先填写上面的提示词'
      return
    }
    // 从localStorage取Key
    const savedKey = apiKeyInput
    if (!savedKey) {
      if (status) status.textContent = '⚠️ 请先填写API Key'
      return
    }
    if (status) status.textContent = '🤖 AI正在思考...'
    
    try {
      // 调用AI生成脚本（通过后端代理调用）
      const r = await fetch(API + '/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          petName: selected.name,
          apiKey: savedKey,
          provider: savedKey.startsWith('sk-') ? 'deepseek' : 'openai',
        }),
      })
      const data = await r.json()
      if (data.code) {
        setCode(data.code)
        if (status) status.textContent = '✅ 脚本已生成！请检查后保存'
      } else {
        if (status) status.textContent = '❌ 生成失败：' + (data.error || '未知错误')
      }
    } catch(e) {
      if (status) status.textContent = '❌ 连接失败：' + e.message
    }
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{background:'#1a1a2e', color:'#888'}}>请先登录</div>

  return (
    <div className="min-h-screen flex flex-col p-4" style={{background: '#1a1a2e'}}>
      <h1 className="text-2xl font-bold text-center mb-4 mt-4" style={{color: '#58CC02'}}>🐉 我的精灵</h1>

      {pets.length === 0 ? (
        <div className="text-center mt-8">
          <p style={{color: '#888', marginBottom: 16}}>还没有精灵，去创建一个吧</p>
          <button onClick={() => nav('/create-pet')}
            className="px-8 py-3 rounded-xl font-bold text-white"
            style={{background: '#58CC02', boxShadow: '0 5px 0 #3d8a02'}}>
            ✨ 创建精灵
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center">
          {/* 精灵列表 */}
          <div className="w-72">
            {pets.map(p => (
              <div key={p.id} onClick={() => selectPet(p)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2 cursor-pointer"
                style={{background: selected?.id === p.id ? '#33335e' : '#1e1e38'}}>
                <div className="w-4 h-4 rounded-full" style={{background: p.skillType === 'shield' ? '#FF6B6B' : '#CE82FF'}} />
                <div>
                  <div style={{color: '#e0e0e0', fontWeight: 600, fontSize: 14}}>{p.name}</div>
                  <div style={{color: '#888', fontSize: 11}}>Elo: {p.elo} · {p.wins}胜 {p.losses}败</div>
                </div>
              </div>
            ))}
          </div>

          {/* 精灵详情 */}
          {selected && (
            <div className="w-80">
              <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
                <h2 className="font-bold mb-2" style={{color: '#58CC02', fontSize: 15}}>{selected.name}</h2>
                <div style={{color: '#aaa', fontSize: 12}}>
                  Elo: {selected.elo} | 版本: v{selected.codeVersion || 0}
                </div>
              </div>

              {/* API Key 配置 */}
              <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
                <h3 className="text-xs font-bold mb-2" style={{color: '#CE82FF'}}>🤖 AI 配置</h3>
                <p className="text-xs mb-2" style={{color: '#666'}}>
                  填上你的 API Key，AI 就能帮你写精灵脚本
                </p>
                <input value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="sk-..." className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                  style={{background: '#1e1e38', color: '#e0e0e0', border: '1px solid #333'}} />
                <button onClick={saveApiKey}
                  className="w-full py-2 rounded-lg font-bold text-white text-xs"
                  style={{background: '#CE82FF', boxShadow: '0 3px 0 #9a5fd6'}}>
                  💾 保存 Key
                </button>
              </div>

              {/* 自然语言指挥AI */}
              <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
                <h3 className="text-xs font-bold mb-2" style={{color: '#FFD93D'}}>🧠 用自然语言指挥AI</h3>
                <p className="text-xs mb-2" style={{color: '#666'}}>
                  用你的话说出想要的打法，AI自动生成脚本。需要先填好上面的API Key。
                </p>
                <textarea id="aiPrompt" rows={3}
                  placeholder='例如："帮我写个脚本：优先抢星星，看到敌人就追着打，近身时开盾，打不过就隐身跑路"'
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                  style={{background: '#1e1e38', color: '#e0e0e0', border: '1px solid #333', resize: 'vertical'}} />
                <button onClick={generateWithAI}
                  className="w-full py-2 rounded-lg font-bold text-white text-xs mb-2"
                  style={{background: '#FFD93D', boxShadow: '0 3px 0 #c8a800', color: '#333'}}>
                  🤖 让AI写脚本
                </button>
                <div id="aiStatus" style={{color: '#888', fontSize: 11}}></div>
              </div>

              {/* 脚本编辑器 */}
              <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
                <h3 className="text-xs font-bold mb-2" style={{color: '#4ECDC4'}}>📝 精灵脚本</h3>
                <textarea id="codeEditor" value={code} onChange={e => setCode(e.target.value)}
                  rows={8} className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2 font-mono"
                  style={{background: '#1e1e38', color: '#e0e0e0', border: '1px solid #333', resize: 'vertical'}} />
                <button onClick={saveCode}
                  className="w-full py-2 rounded-lg font-bold text-white text-xs"
                  style={{background: '#4ECDC4', boxShadow: '0 3px 0 #2da89f'}}>
                  💾 保存脚本
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={() => nav('/')} style={{color: '#666', fontSize: 13, marginTop: 16, textAlign: 'center'}}>
        ← 返回主页
      </button>
    </div>
  )
}
