import { useNavigate } from 'react-router-dom'

export default function HelpPage() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen p-4" style={{background: '#1a1a2e'}}>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4 mt-4" style={{color: '#58CC02'}}>📖 游戏指南</h1>

        {/* 目标 */}
        <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
          <h2 className="font-bold mb-2" style={{color: '#FFD93D', fontSize: 15}}>🎯 获胜目标</h2>
          <p style={{color: '#ccc', fontSize: 13, lineHeight: 1.6}}>
            每局限时45秒，<span style={{color: '#FFD93D', fontWeight: 600}}>先击杀对方3次者获胜</span>。
            时间到则击杀数多者获胜。
          </p>
        </div>

        {/* 地形 */}
        <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
          <h2 className="font-bold mb-2" style={{color: '#4ECDC4', fontSize: 15}}>🗺️ 地图机制</h2>
          
          <div className="flex items-start gap-3 mb-3 p-3 rounded-lg" style={{background: '#1e1e38'}}>
            <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{background: '#8a8a8a', color: '#fff'}}>山</div>
            <div>
              <div style={{color: '#e0e0e0', fontWeight: 600, fontSize: 13}}>⛰️ 山</div>
              <div style={{color: '#888', fontSize: 12}}>灰白色格子。精灵和子弹都无法通过，绕路走吧。</div>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-3 p-3 rounded-lg" style={{background: '#1e1e38'}}>
            <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{background: '#2a6496', color: '#fff'}}>河</div>
            <div>
              <div style={{color: '#e0e0e0', fontWeight: 600, fontSize: 13}}>🌊 河流</div>
              <div style={{color: '#888', fontSize: 12}}>蓝色波纹格子。可以通行但<span style={{color: '#FFD93D'}}>移动速度降低30%</span>，追人或逃命时注意避开。</div>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-3 p-3 rounded-lg" style={{background: '#1e1e38'}}>
            <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{background: '#3a7a33', color: '#fff'}}>草</div>
            <div>
              <div style={{color: '#e0e0e0', fontWeight: 600, fontSize: 13}}>🌿 草丛</div>
              <div style={{color: '#888', fontSize: 12}}>深绿色格子。精灵站上去会<span style={{color: '#58CC02'}}>变半透明隐身</span>，被攻击时有<span style={{color: '#58CC02'}}>50%概率自动闪避</span>。蹲草阴人必备。</div>
            </div>
          </div>
        </div>

        {/* 指令 */}
        <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
          <h2 className="font-bold mb-2" style={{color: '#CE82FF', fontSize: 15}}>📝 指挥你的精灵</h2>
          <p style={{color: '#aaa', fontSize: 12, lineHeight: 1.6, marginBottom: 8}}>
            在「我的精灵」页面，填上API Key后，用自然语言告诉AI你想怎么打。例如：
          </p>
          <div className="p-3 rounded-lg mb-2" style={{background: '#1e1e38'}}>
            <div style={{color: '#FFD93D', fontSize: 12, fontWeight: 600}}>✅ 新手打法</div>
            <div style={{color: '#888', fontSize: 12}}>"优先抢星星，看到敌人就开火，近身开盾"</div>
          </div>
          <div className="p-3 rounded-lg mb-2" style={{background: '#1e1e38'}}>
            <div style={{color: '#FFD93D', fontSize: 12, fontWeight: 600}}>✅ 进阶打法</div>
            <div style={{color: '#888', fontSize: 12}}>"开局抢中间加速，绕山走位，引诱敌人到河边再打，没血了躲草丛"</div>
          </div>
        </div>

        {/* AI配置 */}
        <div className="rounded-xl p-4 mb-3" style={{background: '#262640'}}>
          <h2 className="font-bold mb-2" style={{color: '#58CC02', fontSize: 15}}>🔑 如何获取API Key</h2>
          <p style={{color: '#aaa', fontSize: 12, lineHeight: 1.6}}>
            1. 打开 <span style={{color: '#4ECDC4'}}>platform.deepseek.com</span> 注册<br/>
            2. 左侧点「API Keys」→ 创建Key<br/>
            3. 复制 <span style={{color: '#FFD93D'}}>sk-</span> 开头的Key<br/>
            4. 回到精灵决斗场→我的精灵→填进去<br/>
            5. 打字告诉AI你要什么打法，点生成
          </p>
        </div>

        <button onClick={() => nav(-1)}
          className="w-full py-3 rounded-xl font-bold text-white text-base mt-2 mb-8"
          style={{background: '#4B4B6E', boxShadow: '0 5px 0 #333'}}>
          ← 返回
        </button>
      </div>
    </div>
  )
}
