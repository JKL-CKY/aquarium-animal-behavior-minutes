import { useEffect, useState } from 'react'
import axios from 'axios'
import { Activity, Mic, FileText, AlertCircle, CheckCircle, Clock, Fish, Waves } from 'lucide-react'

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [recentJobs, setRecentJobs] = useState([])
  const [stats, setStats] = useState({
    meetingsProcessed: 0,
    audioFilesAnalyzed: 0,
    reportsGenerated: 0
  })

  useEffect(() => {
    fetchHealth()
    fetchJobs()
    mockStats()
  }, [])

  const fetchHealth = async () => {
    try {
      const res = await axios.get('/api/health')
      setHealth(res.data)
    } catch (e) {
      console.error('Health check failed:', e)
    }
  }

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/api/jobs')
      setRecentJobs(res.data.jobs.slice(0, 5))
    } catch (e) {
      console.error('Failed to fetch jobs:', e)
    }
  }

  const mockStats = () => {
    setStats({
      meetingsProcessed: Math.floor(Math.random() * 50) + 10,
      audioFilesAnalyzed: Math.floor(Math.random() * 200) + 50,
      reportsGenerated: Math.floor(Math.random() * 100) + 20
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'processing': return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />
      default: return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">欢迎使用水族馆声学分析系统</h1>
        <p className="text-gray-600 mt-2">利用水下声学网络监测和分析海洋动物行为</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">已处理会议</p>
              <p className="text-3xl font-bold text-ocean-600 mt-1">{stats.meetingsProcessed}</p>
            </div>
            <div className="bg-ocean-100 p-3 rounded-lg">
              <Mic className="w-8 h-8 text-ocean-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">音频分析</p>
              <p className="text-3xl font-bold text-coral-500 mt-1">{stats.audioFilesAnalyzed}</p>
            </div>
            <div className="bg-coral-100 p-3 rounded-lg">
              <Waves className="w-8 h-8 text-coral-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">生成报告</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.reportsGenerated}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-ocean-600" />
            系统状态
          </h2>
          {health ? (
            <div className="space-y-3">
              {Object.entries(health.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 capitalize">{service.replace('_', ' ')}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status === 'available' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {status === 'available' ? '正常运行' : '未配置'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>无法连接到后端服务</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-ocean-600" />
            最近任务
          </h2>
          {recentJobs.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentJobs.map((job) => (
                <div key={job.job_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-700">{job.job_id}</p>
                      <p className="text-xs text-gray-500">{job.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{job.progress}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>暂无处理中的任务</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-ocean-600 to-ocean-800 rounded-xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Fish className="w-7 h-7" />
              开始新的分析
            </h2>
            <p className="text-ocean-100 mb-6 max-w-xl">
              上传会议录音和水族箱声学数据，系统将自动转写讨论内容、分析动物发声、
              生成健康评估报告、丰容计划和展览调整建议。
            </p>
            <div className="flex gap-4">
              <a
                href="/meeting"
                className="bg-white text-ocean-700 px-6 py-3 rounded-lg font-semibold hover:bg-ocean-50 transition-colors"
              >
                处理会议录音
              </a>
              <a
                href="/audio"
                className="bg-ocean-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ocean-400 transition-colors"
              >
                分析声学数据
              </a>
            </div>
          </div>
          <div className="hidden md:block">
            <Waves className="w-32 h-32 text-ocean-400 opacity-30" />
          </div>
        </div>
      </div>
    </div>
  )
}
