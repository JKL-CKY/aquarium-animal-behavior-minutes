import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Download, Loader2, AlertCircle } from 'lucide-react'

export default function ReportViewer() {
  const { filename } = useParams()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchReport()
  }, [filename])

  const fetchReport = async () => {
    try {
      const res = await axios.get(`/api/download/${filename}`)
      setContent(res.data)
    } catch (e) {
      setError('无法加载报告内容')
      console.error('Failed to fetch report:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/reports"
            className="flex items-center gap-2 text-gray-600 hover:text-ocean-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回报告列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{filename}</h1>
        </div>
        <a
          href={`/api/download/${filename}`}
          className="flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          下载报告
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-12 h-12 text-ocean-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">{error}</h3>
          <Link
            to="/reports"
            className="text-ocean-600 hover:text-ocean-700"
          >
            返回报告列表
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="max-w-4xl mx-auto">
            <article className="markdown-content prose prose-lg max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </div>
  )
}
