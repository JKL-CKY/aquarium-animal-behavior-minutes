import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Mic, Fish, FileText, Waves, Settings, Home } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import AudioAnalysis from './pages/AudioAnalysis.jsx'
import MeetingProcessor from './pages/MeetingProcessor.jsx'
import Reports from './pages/Reports.jsx'
import ReportViewer from './pages/ReportViewer.jsx'

function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/audio', label: '声学分析', icon: Waves },
    { path: '/meeting', label: '会议处理', icon: Mic },
    { path: '/reports', label: '报告列表', icon: FileText },
  ]

  return (
    <nav className="bg-ocean-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Fish className="w-8 h-8 text-ocean-300" />
            <span className="text-xl font-bold">水族馆声学分析系统</span>
          </div>
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-ocean-600 text-white'
                      : 'text-ocean-100 hover:bg-ocean-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audio" element={<AudioAnalysis />} />
          <Route path="/meeting" element={<MeetingProcessor />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:filename" element={<ReportViewer />} />
        </Routes>
      </main>
      <footer className="bg-ocean-900 text-ocean-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">© 2024 水族馆水下声学网络分析系统 | 海洋动物行为研究平台</p>
        </div>
      </footer>
    </div>
  )
}

export default App
