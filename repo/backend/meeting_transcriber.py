import whisper
import torch
from pyannote.audio import Pipeline
from typing import List, Dict, Tuple, Optional
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MeetingTranscriber:
    def __init__(self, whisper_model_size: str = "base", use_gpu: bool = False):
        self.device = "cuda" if use_gpu and torch.cuda.is_available() else "cpu"
        logger.info(f"Loading Whisper model: {whisper_model_size} on {self.device}")
        self.whisper_model = whisper.load_model(whisper_model_size, device=self.device)
        
        self.pyannote_pipeline = None
        huggingface_token = os.getenv("HUGGINGFACE_TOKEN")
        if huggingface_token:
            try:
                logger.info("Loading pyannote speaker diarization pipeline")
                self.pyannote_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=huggingface_token
                )
            except Exception as e:
                logger.warning(f"Failed to load pyannote pipeline: {e}. Speaker diarization will be disabled.")
    
    def transcribe_meeting(self, audio_path: str, language: str = "zh") -> Dict:
        logger.info(f"Transcribing meeting audio: {audio_path}")
        
        result = self.whisper_model.transcribe(
            audio_path,
            language=language,
            word_timestamps=True,
            fp16=self.device == "cuda"
        )
        
        segments = []
        for seg in result["segments"]:
            segments.append({
                "start": float(seg["start"]),
                "end": float(seg["end"]),
                "text": seg["text"].strip(),
                "words": [
                    {
                        "word": word["word"],
                        "start": float(word["start"]),
                        "end": float(word["end"]),
                        "probability": float(word.get("probability", 0.0))
                    }
                    for word in seg.get("words", [])
                ]
            })
        
        full_text = result["text"].strip()
        
        return {
            "text": full_text,
            "segments": segments,
            "language": result.get("language", language),
            "duration": segments[-1]["end"] if segments else 0.0
        }
    
    def diarize_speakers(self, audio_path: str) -> List[Dict]:
        if not self.pyannote_pipeline:
            logger.warning("Speaker diarization not available. Returning empty speaker list.")
            return []
        
        logger.info("Performing speaker diarization")
        
        diarization = self.pyannote_pipeline(audio_path)
        
        speaker_segments = []
        for segment, _, speaker in diarization.itertracks(yield_label=True):
            speaker_segments.append({
                "speaker": speaker,
                "start": float(segment.start),
                "end": float(segment.end),
                "duration": float(segment.end - segment.start)
            })
        
        return speaker_segments
    
    def assign_speakers_to_segments(self, segments: List[Dict], speaker_segments: List[Dict]) -> List[Dict]:
        if not speaker_segments:
            for seg in segments:
                seg["speaker"] = "SPEAKER_00"
            return segments
        
        logger.info("Assigning speakers to transcription segments")
        
        for seg in segments:
            seg_mid = (seg["start"] + seg["end"]) / 2
            
            best_speaker = None
            best_overlap = 0
            
            for spk_seg in speaker_segments:
                overlap_start = max(seg["start"], spk_seg["start"])
                overlap_end = min(seg["end"], spk_seg["end"])
                overlap = max(0, overlap_end - overlap_start)
                
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_speaker = spk_seg["speaker"]
            
            seg["speaker"] = best_speaker or "SPEAKER_00"
        
        return segments
    
    def process_meeting_audio(self, audio_path: str, language: str = "zh") -> Dict:
        logger.info(f"Processing meeting audio: {audio_path}")
        
        transcription = self.transcribe_meeting(audio_path, language)
        speaker_segments = self.diarize_speakers(audio_path)
        segments_with_speakers = self.assign_speakers_to_segments(transcription["segments"], speaker_segments)
        
        speakers = list(set([seg["speaker"] for seg in segments_with_speakers]))
        speakers.sort()
        
        speaker_stats = {}
        for speaker in speakers:
            speaker_segs = [s for s in segments_with_speakers if s["speaker"] == speaker]
            total_time = sum(s["end"] - s["start"] for s in speaker_segs)
            speaker_stats[speaker] = {
                "total_speaking_time": float(total_time),
                "num_segments": len(speaker_segs),
                "segments": speaker_segs
            }
        
        formatted_transcript = self._format_transcript(segments_with_speakers)
        
        return {
            "full_text": transcription["text"],
            "segments": segments_with_speakers,
            "speakers": speakers,
            "speaker_statistics": speaker_stats,
            "formatted_transcript": formatted_transcript,
            "language": transcription["language"],
            "duration": transcription["duration"]
        }
    
    def _format_transcript(self, segments: List[Dict]) -> str:
        lines = []
        current_speaker = None
        current_text = []
        
        for seg in segments:
            if seg["speaker"] != current_speaker:
                if current_speaker is not None:
                    lines.append(f"**{current_speaker}**: {' '.join(current_text)}")
                current_speaker = seg["speaker"]
                current_text = [seg["text"]]
            else:
                current_text.append(seg["text"])
        
        if current_speaker is not None:
            lines.append(f"**{current_speaker}**: {' '.join(current_text)}")
        
        return "\n\n".join(lines)
