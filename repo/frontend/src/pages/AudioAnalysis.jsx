import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Upload, Play, Pause, Volume2, Waves, BarChart3, Loader2, AlertCircle } from 'lucide-react'

export default function AudioAnalysis() {
  const [audioFile, setAudioFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState(null)
  
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const spectrogramDataRef = useRef(null)

  const handleAudioUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAudioFile(file)
      setAnalysisResult(null)
      setError(null)
    }
  }

  const handleVideoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setVideoFile(URL.createObjectURL(file))
      setIsPlaying(false)
    }
  }

  const processAudio = async () => {
    if (!audioFile) return
    
    setIsProcessing(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('file', audioFile)
    
    try {
      const res = await axios.post('/api/audio/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setAnalysisResult(res.data)
      spectrogramDataRef.current = res.data.spectrogram_data
      drawSpectrogram(res.data.spectrogram_data)
    } catch (e) {
      setError(e.response?.data?.detail || '处理失败，请检查音频文件格式')
      console.error('Processing error:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const drawSpectrogram = (spectrogramData) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    
    ctx.fillStyle = '#0c4a6e'
    ctx.fillRect(0, 0, width, height)
    
    const gradient = ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, '#03045e')
    gradient.addColorStop(0.2, '#023e8a')
    gradient.addColorStop(0.4, '#0077b6')
    gradient.addColorStop(0.6, '#0096c7')
    gradient.addColorStop(0.8, '#00b4d8')
    gradient.addColorStop(1, '#90e0ef')
    
    if (spectrogramData.spectrogram) {
      const spec = spectrogramData.spectrogram
      const freqBins = spec.length
      const timeSteps = spec[0].length
      
      for (let t = 0; t < timeSteps; t++) {
        for (let f = 0; f < freqBins; f++) {
          const value = spec[f][t]
          const normalized = (value + 80) / 80
          const intensity = Math.max(0, Math.min(1, normalized))
          
          const x = (t / timeSteps) * width
          const y = height - (f / freqBins) * height
          
          const r = Math.floor(12 + intensity * 144)
          const g = Math.floor(74 + intensity * 111)
          const b = Math.floor(110 + intensity * 129)
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
          ctx.fillRect(x, y, width / timeSteps + 1, height / freqBins + 1)
        }
      }
    } else {
      for (let y = 0; y < height; y++) {
        const hue = 200 + (y / height) * 40
        for (let x = 0; x < width; x++) {
          const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + Math.random() * 0.5
          const lightness = 10 + noise * 40
          ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        if (videoRef.current) videoRef.current.pause()
      } else {
        audioRef.current.play()
        if (videoRef.current) videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const resizeCanvas = () => {
        const container = canvas.parentElement
        canvas.width = container.clientWidth
        canvas.height = 250
        if (spectrogramDataRef.current) {
          drawSpectrogram(spectrogramDataRef.current)
        } else {
          drawSpectrogram({})
        }
      }
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
      return () => window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">声学数据分析</h1>
        <p className="text-gray-600 mt-2">上传水族箱录音，分析动物发声与环境噪音</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-ocean-600" />
            上传文件
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音频文件（.wav, .mp3）
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-ocean-400 hover:bg-ocean-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Waves className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {audioFile ? audioFile.name : '点击或拖拽上传音频文件'}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                视频文件（可选，用于同步播放）
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-ocean-400 hover:bg-ocean-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Play className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {videoFile ? '已选择视频文件' : '点击或拖拽上传视频文件'}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleVideoUpload}
                />
              </label>
            </div>

            <button
              onClick={processAudio}
              disabled={!audioFile || isProcessing}
              className="w-full bg-ocean-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-ocean-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  开始分析
                </>
              )}
            </button>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {videoFile && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">水族箱视频</h2>
            <video
              ref={videoRef}
              src={videoFile}
              className="w-full rounded-lg"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        )}
      </div>

      {analysisResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">声谱图</h2>
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-64 rounded-lg spectrogram-canvas"
              />
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                频率 (kHz)
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                时间 →
              </div>
            </div>
            
            {audioFile && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={togglePlayback}
                  className="bg-ocean-600 text-white p-3 rounded-full hover:bg-ocean-700 transition-colors"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <audio
                  ref={audioRef}
                  src={URL.createObjectURL(audioFile)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-ocean-600 h-2 rounded-full transition-all"
                      style={{ width: `${(currentTime / analysisResult.duration) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(currentTime * 1000).toISOString().substr(14, 5)} / {new Date(analysisResult.duration * 1000).toISOString().substr(14, 5)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-green-600" />
                动物发声分析
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">检测到的发声次数</span>
                  <span className="font-semibold text-gray-800">{analysisResult.animal_analysis.num_calls} 次</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">总发声时长</span>
                  <span className="font-semibold text-gray-800">{analysisResult.animal_analysis.total_call_duration.toFixed(2)} 秒</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">平均频谱中心</span>
                  <span className="font-semibold text-gray-800">{analysisResult.animal_analysis.spectral_centroid_mean.toFixed(0)} Hz</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">平均过零率</span>
                  <span className="font-semibold text-gray-800">{analysisResult.animal_analysis.zero_crossing_rate_mean.toFixed(4)}</span>
                </div>
              </div>
              
              {analysisResult.animal_analysis.calls.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">检测到的发声事件</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {analysisResult.animal_analysis.calls.slice(0, 10).map((call, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                        <span className="text-gray-600">
                          #{idx + 1} {call.start_time.toFixed(2)}s - {call.end_time.toFixed(2)}s
                        </span>
                        <span className="text-green-700 font-medium">
                          {call.peak_frequency.toFixed(0)} Hz
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Waves className="w-5 h-5 text-coral-500" />
                环境噪音分析（水泵）
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">水泵噪音能量占比</span>
                  <span className={`font-semibold ${
                    analysisResult.pump_analysis.pump_energy_ratio > 0.3 ? 'text-coral-600' : 'text-gray-800'
                  }`}>
                    {(analysisResult.pump_analysis.pump_energy_ratio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">RMS 均值</span>
                  <span className="font-semibold text-gray-800">{analysisResult.pump_analysis.rms_mean.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">RMS 标准差</span>
                  <span className="font-semibold text-gray-800">{analysisResult.pump_analysis.rms_std.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">主水泵频率</span>
                  <span className="font-semibold text-gray-800">{analysisResult.pump_analysis.dominant_pump_frequency.toFixed(0)} Hz</span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">声学环境评估</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      analysisResult.pump_analysis.pump_energy_ratio > 0.3 ? 'bg-coral-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${analysisResult.pump_analysis.pump_energy_ratio * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {analysisResult.pump_analysis.pump_energy_ratio > 0.3 
                    ? '⚠️ 水泵噪音较高，可能影响动物发声监测' 
                    : '✓ 声学环境良好，适合监测动物发声'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
