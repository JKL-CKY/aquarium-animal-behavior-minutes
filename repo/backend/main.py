from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import tempfile
import logging
from datetime import datetime
import shutil
import asyncio

from audio_processor import AudioProcessor
from meeting_transcriber import MeetingTranscriber
from ai_summarizer import AISummarizer
from email_sender import EmailSender

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="水族馆水下声学分析系统",
    description="利用水下声学网络进行水族馆动物行为分析和会议纪要生成的全栈系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

audio_processor = AudioProcessor()
meeting_transcriber = MeetingTranscriber()
ai_summarizer = AISummarizer()
email_sender = EmailSender()

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

processing_jobs = {}


class MeetingProcessRequest(BaseModel):
    animal_type: str = "海洋哺乳动物"
    language: str = "zh"
    send_email: bool = True


class ProcessingStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    result: Optional[Dict] = None


@app.get("/")
async def root():
    return {
        "name": "水族馆水下声学分析系统",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/audio/upload": "上传水族箱录音",
            "POST /api/audio/process": "处理音频并分析",
            "POST /api/meeting/process": "处理会议音频并生成完整报告",
            "GET /api/status/{job_id}": "查询处理状态",
            "GET /api/download/{filename}": "下载输出文件",
            "GET /api/health": "健康检查"
        }
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "audio_processor": "available",
            "meeting_transcriber": "available",
            "ai_summarizer": "available" if ai_summarizer.client else "not_configured",
            "email_sender": "available" if email_sender.configured else "not_configured"
        }
    }


@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_ext = os.path.splitext(file.filename)[1]
    new_filename = f"audio_{timestamp}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "message": "File uploaded successfully",
        "filename": new_filename,
        "original_name": file.filename,
        "file_path": file_path,
        "file_size": os.path.getsize(file_path)
    }


@app.post("/api/audio/process")
async def process_audio(file: UploadFile = File(...)):
    logger.info(f"Processing audio file: {file.filename}")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name
    
    try:
        analysis_result = audio_processor.process_audio_file(temp_path)
        
        output_filename = f"spectrogram_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        import json
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        
        return {
            "message": "Audio processed successfully",
            "duration": analysis_result["duration"],
            "animal_analysis": analysis_result["animal_analysis"],
            "pump_analysis": analysis_result["pump_analysis"],
            "spectrogram_data": {
                "times": analysis_result["spectrogram"]["times"],
                "frequencies": analysis_result["spectrogram"]["frequencies"],
                "sample_rate": analysis_result["spectrogram"]["sample_rate"]
            },
            "output_file": output_filename,
            "separated_audio": analysis_result["separated_audio_paths"]
        }
    
    finally:
        os.unlink(temp_path)


@app.post("/api/meeting/process")
async def process_meeting(
    background_tasks: BackgroundTasks,
    meeting_audio: UploadFile = File(...),
    tank_audio: Optional[UploadFile] = File(None),
    animal_type: str = "海洋哺乳动物",
    language: str = "zh",
    send_email: bool = True
):
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    processing_jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "message": "任务已创建，等待处理..."
    }
    
    meeting_temp_path = None
    tank_temp_path = None
    
    try:
        meeting_temp_dir = tempfile.mkdtemp()
        meeting_ext = os.path.splitext(meeting_audio.filename)[1]
        meeting_temp_path = os.path.join(meeting_temp_dir, f"meeting{meeting_ext}")
        
        with open(meeting_temp_path, "wb") as buffer:
            shutil.copyfileobj(meeting_audio.file, buffer)
        
        if tank_audio:
            tank_ext = os.path.splitext(tank_audio.filename)[1]
            tank_temp_path = os.path.join(meeting_temp_dir, f"tank{tank_ext}")
            with open(tank_temp_path, "wb") as buffer:
                shutil.copyfileobj(tank_audio.file, buffer)
        
        background_tasks.add_task(
            process_meeting_background,
            job_id,
            meeting_temp_path,
            tank_temp_path,
            animal_type,
            language,
            send_email,
            meeting_temp_dir
        )
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "会议音频处理任务已启动，请使用任务ID查询进度",
            "check_status_url": f"/api/status/{job_id}"
        }
    
    except Exception as e:
        logger.error(f"Error starting meeting processing: {e}")
        processing_jobs[job_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"任务启动失败: {str(e)}"
        }
        raise HTTPException(status_code=500, detail=str(e))


async def process_meeting_background(
    job_id: str,
    meeting_audio_path: str,
    tank_audio_path: Optional[str],
    animal_type: str,
    language: str,
    send_email: bool,
    temp_dir: str
):
    try:
        processing_jobs[job_id] = {
            "status": "processing",
            "progress": 10,
            "message": "正在转写会议音频..."
        }
        
        transcript_result = meeting_transcriber.process_meeting_audio(
            meeting_audio_path, language
        )
        
        processing_jobs[job_id] = {
            "status": "processing",
            "progress": 40,
            "message": "会议转写完成，正在分析声学数据..."
        }
        
        if tank_audio_path and os.path.exists(tank_audio_path):
            audio_analysis = audio_processor.process_audio_file(tank_audio_path)
        else:
            audio_analysis = {
                "spectrogram": {"spectrogram": [], "times": [], "frequencies": [], "sample_rate": 22050},
                "animal_analysis": {
                    "num_calls": 0,
                    "calls": [],
                    "mfcc_mean": [],
                    "spectral_centroid_mean": 0,
                    "zero_crossing_rate_mean": 0,
                    "total_call_duration": 0
                },
                "pump_analysis": {
                    "pump_energy_ratio": 0,
                    "rms_mean": 0,
                    "rms_std": 0,
                    "dominant_pump_frequency": 0
                },
                "duration": 0
            }
        
        processing_jobs[job_id] = {
            "status": "processing",
            "progress": 60,
            "message": "声学分析完成，正在生成AI摘要..."
        }
        
        full_report = ai_summarizer.generate_full_report(
            transcript_result,
            audio_analysis,
            animal_type
        )
        
        processing_jobs[job_id] = {
            "status": "processing",
            "progress": 85,
            "message": "AI摘要完成，正在保存结果..."
        }
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        report_filename = f"meeting_report_{timestamp}.md"
        report_path = os.path.join(OUTPUT_DIR, report_filename)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(full_report["full_markdown"])
        
        transcript_filename = f"transcript_{timestamp}.json"
        transcript_path = os.path.join(OUTPUT_DIR, transcript_filename)
        import json
        with open(transcript_path, "w", encoding="utf-8") as f:
            json.dump(transcript_result, f, ensure_ascii=False, indent=2)
        
        email_results = {}
        if send_email:
            processing_jobs[job_id]["message"] = "正在发送邮件..."
            email_results = email_sender.send_full_report(
                full_report["full_markdown"],
                full_report["audio_summary"]
            )
        
        processing_jobs[job_id] = {
            "status": "completed",
            "progress": 100,
            "message": "处理完成！",
            "result": {
                "report_file": report_filename,
                "transcript_file": transcript_filename,
                "report": full_report,
                "transcript": transcript_result,
                "audio_analysis": audio_analysis,
                "email_sent": send_email,
                "email_results": email_results
            }
        }
        
        logger.info(f"Job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        processing_jobs[job_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"处理失败: {str(e)}"
        }
    finally:
        try:
            shutil.rmtree(temp_dir)
        except:
            pass


@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_jobs[job_id]


@app.get("/api/jobs")
async def list_jobs():
    return {
        "jobs": [
            {"job_id": job_id, **status}
            for job_id, status in processing_jobs.items()
        ]
    }


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@app.get("/api/outputs")
async def list_outputs():
    files = []
    if os.path.exists(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            if os.path.isfile(file_path):
                files.append({
                    "filename": filename,
                    "size": os.path.getsize(file_path),
                    "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                    "download_url": f"/api/download/{filename}"
                })
    
    return {"files": sorted(files, key=lambda x: x["modified"], reverse=True)}


@app.post("/api/email/send")
async def send_email_endpoint(
    recipients: List[str],
    subject: str,
    body: str,
    attachments: Optional[List[str]] = None
):
    attachment_paths = []
    if attachments:
        for att in attachments:
            att_path = os.path.join(OUTPUT_DIR, att)
            if os.path.exists(att_path):
                attachment_paths.append(att_path)
    
    success = email_sender.send_with_attachments(
        recipients=recipients,
        subject=subject,
        body=body,
        attachment_paths=attachment_paths
    )
    
    return {"success": success, "message": "Email sent" if success else "Email send failed"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
