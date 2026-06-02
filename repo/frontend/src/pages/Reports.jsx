import { useState, useEffect } from 'react'
import axios from 'axios'
import { FileText, Download, Eye, Calendar, Clock, FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Reports() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const res = await axios.get('/api/outputs')
      setFiles(res.data.files)
    } catch (e) {
      console.error('Failed to fetch files:', e)
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (filename) => {
    if (filename.endsWith('.md')) return <FileText className="w-6 h-6 text-ocean-600" />
    if (filename.endsWith('.json')) return <FileSpreadsheet className="w-6 h-6 text-yellow-600" />
    return <FileText className="w-6 h-6 text-gray-600" />
  }

  const getFileType = (filename) => {
    if (filename.includes('report')) return '报告'
    if (filename.includes('transcript')) return '转录'
    if (filename.includes('spectrogram')) return '声谱图'
    return '其他'
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const reports = files.filter(f => f.filename.endsWith('.md'))
  const otherFiles = files.filter(f => !f.filename.endsWith('.md'))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">报告列表</h1>
        <p className="text-gray-600 mt-2">查看和下载所有生成的会议纪要和分析报告</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">暂无报告</h3>
          <p className="text-gray-500 mb-6">上传会议音频开始生成分析报告</p>
          <Link
            to="/meeting"
            className="inline-block bg-ocean-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-ocean-700 transition-colors"
          >
            开始处理会议
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {reports.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">会议报告</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((file) => (
                  <div
                    key={file.filename}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.filename)}
                          <span className="text-xs px-2 py-1 bg-ocean-100 text-ocean-700 rounded-full">
                            {getFileType(file.filename)}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{file.filename}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(file.modified)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatSize(file.size)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/reports/${file.filename}`}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-ocean-50 text-ocean-700 rounded-lg hover:bg-ocean-100 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </Link>
                        <a
                          href={`/api/download/${file.filename}`}
                          className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherFiles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">其他文件</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">文件名</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">类型</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">大小</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">修改时间</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {otherFiles.map((file) => (
                      <tr key={file.filename} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getFileIcon(file.filename)}
                            <span className="text-gray-800">{file.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{getFileType(file.filename)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatSize(file.size)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(file.modified)}</td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href={`/api/download/${file.filename}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-ocean-50 text-ocean-700 rounded-lg hover:bg-ocean-100 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            下载
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
