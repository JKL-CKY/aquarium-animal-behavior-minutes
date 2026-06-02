import { useState, useEffect } from 'react'
import axios from 'axios'
import { Upload, Mic, Waves, Send, Loader2, AlertCircle, CheckCircle, Clock, Fish } from 'lucide-react'

export default function MeetingProcessor() {
  const [meetingAudio, setMeetingAudio] = useState(null)
  const [tankAudio, setTankAudio] = useState(null)
  const [animalType, setAnimalType] = useState('海洋哺乳动物')
  const [language, setLanguage] = useState('zh')
  const [sendEmail, setSendEmail] = useState(true)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let interval
    if (jobId && jobStatus?.status === 'processing') {
      interval = setInterval(fetchJobStatus, 2000)
    }
    return () => clearInterval(interval)
  }, [jobId, jobStatus?.status])

  const fetchJobStatus = async () => {
    if (!jobId) return
    try {
      const res = await axios.get(`/api/status/${jobId}`)
      setJobStatus(res.data)
    } catch (e) {
      console.error('Failed to fetch job status:', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!meetingAudio) {
      setError('请上传会议录音文件')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('meeting_audio', meetingAudio)
    if (tankAudio) formData.append('tank_audio', tankAudio)
    formData.append('animal_type', animalType)
    formData.append('language', language)
    formData.append('send_email', sendEmail.toString())

    try {
      const res = await axios.post('/api/meeting/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setJobId(res.data.job_id)
      setJobStatus({ status: 'processing', progress: 0, message: '任务已启动...' })
    } catch (e) {
      setError(e.response?.data?.detail || '提交失败，请重试')
      console.error('Submission error:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setMeetingAudio(null)
    setTankAudio(null)
    setJobId(null)
    setJobStatus(null)
    setError(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'processing': return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      case 'failed': return <AlertCircle className="w-6 h-6 text-red-500" />
      default: return <Clock className="w-6 h-6 text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">会议音频处理</h1>
        <p className="text-gray-600 mt-2">
          上传饲养员与兽医的会议录音，系统将自动转写、分析并生成完整报告
        </p>
      </div>

      {!jobId ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-ocean-600" />
                会议录音
              </h2>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-ocean-400 hover:bg-ocean-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {meetingAudio ? meetingAudio.name : '点击或拖拽上传会议录音'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">支持 .wav, .mp3, .m4a 格式</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  onChange={(e) => setMeetingAudio(e.target.files[0])}
                />
              </label>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Waves className="w-5 h-5 text-coral-500" />
                水族箱录音（可选）
              </h2>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-coral-400 hover:bg-coral-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {tankAudio ? tankAudio.name : '上传同期水族箱声学数据'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">用于动物发声分析</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  onChange={(e) => setTankAudio(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">处理选项</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  动物类型
                </label>
                <select
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                >
                  <option value="海洋哺乳动物">海洋哺乳动物（海豚、鲸等）</option>
                  <option value="鱼类">鱼类</option>
                  <option value="海洋无脊椎动物">海洋无脊椎动物</option>
                  <option value="两栖动物">两栖动物</option>
                  <option value="爬行动物">爬行动物（海龟等）</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会议语言
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-5 h-5 text-ocean-600 border-gray-300 rounded focus:ring-ocean-500"
                  />
                  <span className="text-sm text-gray-700">发送邮件通知相关部门</span>
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
            <button
              type="submit"
              disabled={!meetingAudio || isSubmitting}
              className="px-8 py-3 bg-ocean-600 text-white rounded-lg font-semibold hover:bg-ocean-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  开始处理
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">处理状态</h2>
                <p className="text-sm text-gray-500">任务 ID: {jobId}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(jobStatus?.status)}`}>
                {jobStatus?.status === 'processing' ? '处理中' : 
                 jobStatus?.status === 'completed' ? '已完成' :
                 jobStatus?.status === 'failed' ? '失败' : '等待中'}
              </span>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {getStatusIcon(jobStatus?.status)}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{jobStatus?.message}</p>
                  {jobStatus?.status === 'processing' && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-ocean-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${jobStatus?.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{jobStatus?.progress || 0}%</p>
                    </div>
                  )}
                </div>
              </div>

              {jobStatus?.status === 'processing' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">处理步骤</h4>
                  <div className="space-y-2">
                    {[
                      { step: '会议音频转写', threshold: 40 },
                      { step: '声学数据分析', threshold: 60 },
                      { step: 'AI 摘要生成', threshold: 85 },
                      { step: '结果保存与邮件发送', threshold: 100 },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          jobStatus.progress >= item.threshold ? 'bg-green-500 text-white' : 'bg-gray-300'
                        }`}>
                          {jobStatus.progress >= item.threshold ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span className="text-xs">{idx + 1}</span>
                          )}
                        </div>
                        <span className={`${
                          jobStatus.progress >= item.threshold ? 'text-gray-800' : 'text-gray-400'
                        }`}>
                          {item.step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jobStatus?.status === 'completed' && jobStatus?.result && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">处理完成！</h4>
                    <div className="space-y-2 text-sm text-green-700">
                      <p>📄 报告文件: {jobStatus.result.report_file}</p>
                      <p>📝 转录文件: {jobStatus.result.transcript_file}</p>
                      {jobStatus.result.email_sent && (
                        <p>📧 邮件已发送至: 饲养团队、教育部门</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <a
                      href={`/api/download/${jobStatus.result.report_file}`}
                      className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      下载完整报告
                    </a>
                    <a
                      href={`/reports/${jobStatus.result.report_file}`}
                      className="px-6 py-2 border border-ocean-600 text-ocean-600 rounded-lg hover:bg-ocean-50 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      在线查看
                    </a>
                    <button
                      onClick={resetForm}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      处理新会议
                    </button>
                  </div>
                </div>
              )}

              {jobStatus?.status === 'failed' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
                  >
                    重试
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    返回上传
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Download({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  )
}

function Eye({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  )
}
