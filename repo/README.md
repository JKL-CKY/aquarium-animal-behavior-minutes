# 水族馆水下声学分析系统

利用水下声学网络进行水族馆动物行为分析和会议纪要生成的全栈系统。

## 功能特性

### 🔊 声学分析
- **声谱图生成**：使用 librosa 对水下录音进行时频分析
- **声源分离**：自动分离动物发声与水泵噪音
- **动物发声检测**：识别和分析海洋动物的发声模式
- **环境噪音评估**：监测水泵等设备的噪音水平

### 🎙️ 会议处理
- **语音转写**：使用 OpenAI Whisper 转写饲养员与兽医的讨论内容
- **说话人识别**：使用 pyannote.audio 识别不同参会人员
- **多语言支持**：支持中文、英文、日文、韩文等多种语言

### 🤖 AI 智能分析
- **健康评估**：基于声学数据和会议讨论生成动物健康报告
- **丰容计划**：自动生成动物丰容方案建议
- **展览调整**：提出展区声学环境优化建议
- **会议纪要**：自动整理结构化的会议记录

### 📧 通知系统
- 自动发送 Markdown 格式邮件
- 支持教育部门和饲养团队分别通知
- HTML 富文本邮件格式

## 技术栈

### 后端
- **FastAPI**：高性能 Python Web 框架
- **librosa**：音频分析和处理
- **OpenAI Whisper**：语音识别
- **pyannote.audio**：说话人分离
- **OpenAI GPT-4**：智能摘要生成
- **Pandas**：数据处理

### 前端
- **React 18**：用户界面框架
- **Vite**：构建工具
- **Tailwind CSS**：样式框架
- **Chart.js**：图表可视化
- **React Router**：路由管理

## 项目结构

```
auto24/
├── backend/                    # 后端服务
│   ├── __init__.py
│   ├── main.py                # FastAPI 主服务
│   ├── audio_processor.py     # 音频处理模块
│   ├── meeting_transcriber.py # 会议转写模块
│   ├── ai_summarizer.py       # AI 摘要模块
│   └── email_sender.py        # 邮件发送模块
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AudioAnalysis.jsx
│   │   │   ├── MeetingProcessor.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── ReportViewer.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── requirements.txt            # Python 依赖
├── .env.example               # 环境变量示例
└── README.md
```

## 快速开始

### 1. 环境配置

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，填入必要的 API 密钥
OPENAI_API_KEY=your_openai_api_key
HUGGINGFACE_TOKEN=your_huggingface_token
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 2. 后端服务

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API 文档：http://localhost:8000/docs

### 3. 前端应用

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问：http://localhost:3000

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/audio/upload` | 上传音频文件 |
| POST | `/api/audio/process` | 处理音频并分析 |
| POST | `/api/meeting/process` | 处理会议音频生成报告 |
| GET | `/api/status/{job_id}` | 查询处理状态 |
| GET | `/api/jobs` | 列出所有任务 |
| GET | `/api/download/{filename}` | 下载输出文件 |
| GET | `/api/outputs` | 列出所有输出文件 |
| POST | `/api/email/send` | 发送邮件 |
| GET | `/api/health` | 健康检查 |

## 使用流程

### 声学数据分析
1. 进入"声学分析"页面
2. 上传水族箱录音文件（支持 .wav, .mp3 等）
3. 可选：上传同期视频用于同步播放
4. 点击"开始分析"
5. 查看声谱图、动物发声分析和环境噪音评估

### 会议处理
1. 进入"会议处理"页面
2. 上传会议录音文件
3. 可选：上传同期水族箱声学数据
4. 选择动物类型和会议语言
5. 点击"开始处理"
6. 等待处理完成（后台任务，可关闭页面）
7. 在"报告列表"中查看或下载生成的报告

## 生成的报告内容

每份完整报告包含：

1. **会议基本信息**
   - 日期、动物类型、录音时长、参会人员

2. **声学数据分析摘要**
   - 动物发声统计
   - 环境噪音分析

3. **会议纪要**
   - 讨论议题摘要
   - 关键决策点
   - 行动项

4. **动物健康评估**
   - 整体健康状态
   - 异常行为识别
   - 潜在风险预警

5. **丰容计划**
   - 环境、认知、社交、食物丰容建议
   - 实施时间表
   - 效果评估方法

6. **展览调整建议**
   - 声学环境优化
   - 降噪方案
   - 游客体验改善

7. **附录：完整会议转录**

## 注意事项

1. **API 密钥**：需要有效的 OpenAI API Key 和 Hugging Face Token
2. **pyannote 访问**：需在 Hugging Face 接受 pyannote/speaker-diarization-3.1 的使用条款
3. **内存需求**：Whisper 模型和音频处理需要较大内存，建议 8GB 以上
4. **处理时间**：长音频处理可能需要较长时间，系统采用后台任务处理
5. **文件存储**：上传的文件和生成的报告存储在 `uploads/` 和 `outputs/` 目录

## 许可证

MIT License
