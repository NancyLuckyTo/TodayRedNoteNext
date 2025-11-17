import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { Settings, Plus, Info, Search, Lock, LogOut } from 'lucide-react'
import avatarImg from '@/assets/images/avatar.png'

const ProfilePage = () => {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // 激活的选项卡: 笔记、收藏、赞过
  const [activeTab, setActiveTab] = useState<'notes' | 'saved' | 'liked'>(
    'notes'
  )

  return (
    <div className="min-h-screen">
      {/* 头部容器 */}
      <div className="bg-linear-to-b from-gray-600 to-gray-500 px-6 pt-8 pb-6">
        {/* 头像、昵称、简介 */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-400">
              <img
                src={avatarImg}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {/* 黄色加号按钮 */}
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5 text-gray-900" strokeWidth={3} />
            </button>
          </div>

          {/* 右侧文字信息区域：flex-1 占满剩余宽度 */}
          <div className="flex-1 pt-2">
            <div className="flex items-center justify-between">
              <h1 className="text-white text-xl font-bold mb-2">简笔画</h1>
              <Button variant="ghost" onClick={onLogout}>
                {<LogOut className="w-5 h-5 text-gray-300" />}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-gray-200 text-sm mb-1.5">
              <span>今日号：18923080116</span>
            </div>
            <div className="flex items-center gap-1 text-gray-200 text-sm">
              <span>IP 属地: 湖北</span>
              <Info className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-gray-300 text-sm mb-2">点击这里，填写简介</div>
        </div>

        <div className="flex items-center justify-between">
          {/* 关注、粉丝、获赞数据 */}
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1">0</div>
              <div className="text-gray-300 text-xs">关注</div>
            </div>
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1">0</div>
              <div className="text-gray-300 text-xs">粉丝</div>
            </div>
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1">0</div>
              <div className="text-gray-300 text-xs">获赞与收藏</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-6 py-2 rounded-full border-2 border-white/30 text-white text-sm font-medium">
              编辑资料
            </button>
            <button className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 白色卡片容器 */}
      <div className="bg-white rounded-t-3xl min-h-[70vh]">
        {/* 吸顶导航栏 */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center px-6 pt-5 pb-3">
            {/* 标签页按钮组 */}
            <div className="flex-1 flex gap-10">
              {/* 笔记 Tab */}
              <button
                onClick={() => setActiveTab('notes')}
                className={`relative pb-2 text-base font-medium ${
                  activeTab === 'notes' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                笔记
                {activeTab === 'notes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
                )}
              </button>
              {/* 收藏 Tab */}
              <button
                onClick={() => setActiveTab('saved')}
                className={`relative pb-2 text-base font-medium ${
                  activeTab === 'saved' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                收藏
                {activeTab === 'saved' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                )}
              </button>
              {/* 赞过 Tab */}
              <button
                onClick={() => setActiveTab('liked')}
                className={`relative pb-2 flex items-center gap-1.5 text-base font-medium ${
                  activeTab === 'liked' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                赞过
                {activeTab === 'liked' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                )}
              </button>
            </div>
            <Search className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
