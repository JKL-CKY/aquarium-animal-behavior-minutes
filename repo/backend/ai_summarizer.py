from openai import OpenAI
import os
from typing import Dict, List, Optional
import logging
from dotenv import load_dotenv
import json
import pandas as pd

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AISummarizer:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found. AI summarization will be disabled.")
            self.client = None
        else:
            self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-4-1106-preview"
    
    def _call_openai(self, system_prompt: str, user_prompt: str, max_tokens: int = 4000) -> str:
        if not self.client:
            return "API_KEY_NOT_CONFIGURED: 请配置OPENAI_API_KEY以启用AI摘要功能。"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return f"ERROR: AI摘要生成失败 - {str(e)}"
    
    def generate_health_assessment(self, transcript: str, audio_analysis: Dict, animal_type: str = "海洋哺乳动物") -> Dict:
        logger.info("Generating health assessment")
        
        system_prompt = f"""你是一位资深的水族馆兽医和动物行为专家。你的任务是根据饲养员和兽医的会议讨论记录，以及水下声学数据分析，生成一份专业的{animal_type}健康评估报告。

请按照以下结构生成报告：
1. 整体健康状态评估
2. 关键健康指标分析
3. 异常行为/发声模式识别
4. 潜在健康风险预警
5. 建议的检查/治疗方案

请使用Markdown格式，内容要专业、具体、有可操作性。"""
        
        user_prompt = f"""会议讨论记录：
{transcript}

声学数据分析结果：
- 检测到的动物发声次数: {audio_analysis.get('animal_analysis', {}).get('num_calls', 0)}
- 总发声时长: {audio_analysis.get('animal_analysis', {}).get('total_call_duration', 0):.2f}秒
- 平均发声峰值频率: {audio_analysis.get('animal_analysis', {}).get('spectral_centroid_mean', 0):.2f}Hz
- 水泵噪音能量占比: {audio_analysis.get('pump_analysis', {}).get('pump_energy_ratio', 0):.2%}

请根据以上信息生成健康评估报告。"""
        
        content = self._call_openai(system_prompt, user_prompt)
        
        return {
            "title": f"{animal_type}健康评估报告",
            "content": content,
            "type": "health_assessment"
        }
    
    def generate_enrichment_plan(self, transcript: str, audio_analysis: Dict, animal_type: str = "海洋哺乳动物") -> Dict:
        logger.info("Generating enrichment plan")
        
        system_prompt = f"""你是一位专业的水族馆动物丰容专家。你的任务是根据会议讨论和声学数据分析，为{animal_type}设计一套科学的丰容计划。

丰容计划应包含以下方面：
1. 环境丰容建议
2. 认知丰容活动
3. 社交丰容方案
4. 食物丰容策略
5. 感官丰容（特别是听觉/声学丰容）
6. 实施时间表
7. 效果评估方法

请使用Markdown格式，提供具体、可执行的建议。"""
        
        user_prompt = f"""会议讨论记录：
{transcript}

声学数据分析结果：
- 发声活跃度: {'高' if audio_analysis.get('animal_analysis', {}).get('num_calls', 0) > 50 else '中等' if audio_analysis.get('animal_analysis', {}).get('num_calls', 0) > 20 else '低'}
- 发声频率特征: 平均{audio_analysis.get('animal_analysis', {}).get('spectral_centroid_mean', 0):.0f}Hz
- 环境噪音水平: {'较高' if audio_analysis.get('pump_analysis', {}).get('pump_energy_ratio', 0) > 0.3 else '正常'}

请基于以上信息生成丰容计划。"""
        
        content = self._call_openai(system_prompt, user_prompt)
        
        return {
            "title": f"{animal_type}丰容计划",
            "content": content,
            "type": "enrichment_plan"
        }
    
    def generate_exhibition_adjustment(self, transcript: str, audio_analysis: Dict, animal_type: str = "海洋哺乳动物") -> Dict:
        logger.info("Generating exhibition adjustment recommendations")
        
        system_prompt = f"""你是一位水族馆展览设计专家。你的任务是根据动物行为和声学数据，提出{animal_type}展区的调整优化建议。

请考虑以下方面：
1. 展区声学环境优化
2. 水泵/过滤系统降噪方案
3. 游客体验改善
4. 动物福利与展示效果的平衡
5. 教育解说内容更新
6. 技术升级建议

请使用Markdown格式，提供切实可行的调整方案。"""
        
        user_prompt = f"""会议讨论记录：
{transcript}

声学数据分析结果：
- 水泵噪音能量占比: {audio_analysis.get('pump_analysis', {}).get('pump_energy_ratio', 0):.2%}
- 水泵RMS均值: {audio_analysis.get('pump_analysis', {}).get('rms_mean', 0):.4f}
- 动物发声与环境噪音比: {1 - audio_analysis.get('pump_analysis', {}).get('pump_energy_ratio', 0):.2%}
- 录音总时长: {audio_analysis.get('duration', 0):.0f}秒

请根据以上声学环境数据，提出展区调整建议。"""
        
        content = self._call_openai(system_prompt, user_prompt)
        
        return {
            "title": f"{animal_type}展区调整建议",
            "content": content,
            "type": "exhibition_adjustment"
        }
    
    def generate_meeting_minutes(self, transcript: str, speakers: List[str]) -> Dict:
        logger.info("Generating meeting minutes")
        
        system_prompt = """你是一位专业的会议记录员。请根据水族馆饲养员和兽医的会议转录内容，生成一份结构化的会议纪要。

会议纪要应包含：
1. 会议基本信息
2. 参会人员
3. 讨论议题摘要
4. 关键决策点
5. 行动项（负责人、截止日期）
6. 下次会议安排

请使用Markdown格式，确保内容清晰、重点突出。"""
        
        speakers_str = ", ".join(speakers)
        user_prompt = f"""会议转录内容：
{transcript}

参会人员（说话人标识）：{speakers_str}

请生成会议纪要。"""
        
        content = self._call_openai(system_prompt, user_prompt)
        
        return {
            "title": "水族馆动物行为讨论会会议纪要",
            "content": content,
            "type": "meeting_minutes"
        }
    
    def generate_full_report(self, transcript_data: Dict, audio_analysis: Dict, animal_type: str = "海洋哺乳动物") -> Dict:
        logger.info("Generating full comprehensive report")
        
        transcript = transcript_data.get("formatted_transcript", transcript_data.get("full_text", ""))
        speakers = transcript_data.get("speakers", [])
        
        meeting_minutes = self.generate_meeting_minutes(transcript, speakers)
        health_assessment = self.generate_health_assessment(transcript, audio_analysis, animal_type)
        enrichment_plan = self.generate_enrichment_plan(transcript, audio_analysis, animal_type)
        exhibition_adjustment = self.generate_exhibition_adjustment(transcript, audio_analysis, animal_type)
        
        full_markdown = f"""# 水族馆动物行为讨论纪要 - 综合报告

---

## 📋 会议基本信息
- **日期**: {pd.Timestamp.now().strftime('%Y年%m月%d日')}
- **动物类型**: {animal_type}
- **录音时长**: {audio_analysis.get('duration', 0):.1f}分钟
- **参会人员**: {', '.join(speakers)}

---

## 🔊 声学数据分析摘要

### 动物发声分析
- 检测到发声次数: **{audio_analysis.get('animal_analysis', {}).get('num_calls', 0)}** 次
- 总发声时长: **{audio_analysis.get('animal_analysis', {}).get('total_call_duration', 0):.2f}** 秒
- 平均频谱中心: **{audio_analysis.get('animal_analysis', {}).get('spectral_centroid_mean', 0):.0f}** Hz

### 环境噪音分析
- 水泵噪音占比: **{audio_analysis.get('pump_analysis', {}).get('pump_energy_ratio', 0):.1%}**
- 水泵RMS均值: **{audio_analysis.get('pump_analysis', {}).get('rms_mean', 0):.4f}**
- 主泵频率: **{audio_analysis.get('pump_analysis', {}).get('dominant_pump_frequency', 0):.0f}** Hz

---

{meeting_minutes['content']}

---

{health_assessment['content']}

---

{enrichment_plan['content']}

---

{exhibition_adjustment['content']}

---

## 📎 附录：完整会议转录

{transcript}
"""
        
        return {
            "meeting_minutes": meeting_minutes,
            "health_assessment": health_assessment,
            "enrichment_plan": enrichment_plan,
            "exhibition_adjustment": exhibition_adjustment,
            "full_markdown": full_markdown,
            "audio_summary": {
                "num_calls": audio_analysis.get('animal_analysis', {}).get('num_calls', 0),
                "total_call_duration": audio_analysis.get('animal_analysis', {}).get('total_call_duration', 0),
                "pump_noise_ratio": audio_analysis.get('pump_analysis', {}).get('pump_energy_ratio', 0)
            }
        }
