import librosa
import numpy as np
from scipy import signal
from scipy.io import wavfile
import tempfile
import os
from typing import Dict, Tuple, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AudioProcessor:
    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate
        self.pump_freq_range = (40, 150)
        self.animal_freq_range = (150, 8000)

    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        logger.info(f"Loading audio: {audio_path}")
        y, sr = librosa.load(audio_path, sr=self.sample_rate)
        return y, sr

    def compute_spectrogram(self, y: np.ndarray) -> Dict:
        logger.info("Computing spectrogram")
        D = librosa.stft(y, n_fft=2048, hop_length=512)
        S_db = librosa.amplitude_to_db(np.abs(D), ref=np.max)
        
        times = librosa.times_like(D, sr=self.sample_rate, hop_length=512)
        freqs = librosa.fft_frequencies(sr=self.sample_rate, n_fft=2048)
        
        return {
            "spectrogram": S_db.tolist(),
            "times": times.tolist(),
            "frequencies": freqs.tolist(),
            "sample_rate": self.sample_rate
        }

    def separate_sources(self, y: np.ndarray) -> Dict[str, np.ndarray]:
        logger.info("Separating audio sources using harmonic-percussive separation and frequency filtering")
        
        D = librosa.stft(y, n_fft=2048, hop_length=512)
        H, P = librosa.decompose.hpss(D, kernel_size=31)
        
        freqs = librosa.fft_frequencies(sr=self.sample_rate, n_fft=2048)
        pump_mask = (freqs >= self.pump_freq_range[0]) & (freqs <= self.pump_freq_range[1])
        animal_mask = (freqs >= self.animal_freq_range[0]) & (freqs <= self.animal_freq_range[1])
        
        pump_D = D.copy()
        pump_D[~pump_mask, :] = 0
        pump_D = pump_D * 0.8 + H * 0.2
        
        animal_D = D.copy()
        animal_D[~animal_mask, :] = 0
        animal_D = animal_D * 0.7 + P * 0.3
        
        pump_audio = librosa.istft(pump_D, hop_length=512)
        animal_audio = librosa.istft(animal_D, hop_length=512)
        
        return {
            "original": y,
            "pump": pump_audio,
            "animal": animal_audio
        }

    def analyze_animal_calls(self, y: np.ndarray) -> Dict:
        logger.info("Analyzing animal vocalizations")
        
        animal_audio = self.separate_sources(y)["animal"]
        
        D = np.abs(librosa.stft(animal_audio, n_fft=2048, hop_length=512))
        freqs = librosa.fft_frequencies(sr=self.sample_rate, n_fft=2048)
        
        energy = np.sum(D, axis=0)
        energy_threshold = np.mean(energy) + 0.5 * np.std(energy)
        call_indices = np.where(energy > energy_threshold)[0]
        
        calls = []
        if len(call_indices) > 0:
            current_call_start = call_indices[0]
            for i in range(1, len(call_indices)):
                if call_indices[i] - call_indices[i-1] > 5:
                    start_time = librosa.frames_to_time(current_call_start, sr=self.sample_rate, hop_length=512)
                    end_time = librosa.frames_to_time(call_indices[i-1], sr=self.sample_rate, hop_length=512)
                    
                    call_spectrum = np.mean(D[:, current_call_start:call_indices[i-1]], axis=1)
                    peak_freq = freqs[np.argmax(call_spectrum)]
                    
                    calls.append({
                        "start_time": float(start_time),
                        "end_time": float(end_time),
                        "duration": float(end_time - start_time),
                        "peak_frequency": float(peak_freq),
                        "energy": float(np.mean(energy[current_call_start:call_indices[i-1]]))
                    })
                    current_call_start = call_indices[i]
            
            start_time = librosa.frames_to_time(current_call_start, sr=self.sample_rate, hop_length=512)
            end_time = librosa.frames_to_time(call_indices[-1], sr=self.sample_rate, hop_length=512)
            call_spectrum = np.mean(D[:, current_call_start:call_indices[-1]+1], axis=1)
            peak_freq = freqs[np.argmax(call_spectrum)]
            calls.append({
                "start_time": float(start_time),
                "end_time": float(end_time),
                "duration": float(end_time - start_time),
                "peak_frequency": float(peak_freq),
                "energy": float(np.mean(energy[current_call_start:call_indices[-1]+1]))
            })
        
        mfccs = librosa.feature.mfcc(y=animal_audio, sr=self.sample_rate, n_mfcc=13)
        spectral_centroid = librosa.feature.spectral_centroid(y=animal_audio, sr=self.sample_rate)
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y=animal_audio)
        
        return {
            "num_calls": len(calls),
            "calls": calls,
            "mfcc_mean": np.mean(mfccs, axis=1).tolist(),
            "spectral_centroid_mean": float(np.mean(spectral_centroid)),
            "zero_crossing_rate_mean": float(np.mean(zero_crossing_rate)),
            "total_call_duration": float(sum(c["duration"] for c in calls))
        }

    def analyze_pump_noise(self, y: np.ndarray) -> Dict:
        logger.info("Analyzing pump noise characteristics")
        
        pump_audio = self.separate_sources(y)["pump"]
        
        D = np.abs(librosa.stft(pump_audio, n_fft=2048, hop_length=512))
        freqs = librosa.fft_frequencies(sr=self.sample_rate, n_fft=2048)
        
        pump_band_mask = (freqs >= self.pump_freq_range[0]) & (freqs <= self.pump_freq_range[1])
        pump_energy = np.sum(D[pump_band_mask, :])
        total_energy = np.sum(D)
        
        rms = librosa.feature.rms(y=pump_audio)
        
        return {
            "pump_energy_ratio": float(pump_energy / total_energy if total_energy > 0 else 0),
            "rms_mean": float(np.mean(rms)),
            "rms_std": float(np.std(rms)),
            "dominant_pump_frequency": float(freqs[pump_band_mask][np.argmax(np.mean(D[pump_band_mask, :], axis=1))]) if np.any(pump_band_mask) else 0.0
        }

    def save_audio(self, audio_data: np.ndarray, output_path: str):
        wavfile.write(output_path, self.sample_rate, (audio_data * 32767).astype(np.int16))

    def process_audio_file(self, audio_path: str) -> Dict:
        logger.info(f"Processing audio file: {audio_path}")
        
        y, sr = self.load_audio(audio_path)
        
        spectrogram = self.compute_spectrogram(y)
        separated = self.separate_sources(y)
        animal_analysis = self.analyze_animal_calls(y)
        pump_analysis = self.analyze_pump_noise(y)
        
        temp_dir = tempfile.mkdtemp()
        animal_path = os.path.join(temp_dir, "animal_vocalizations.wav")
        pump_path = os.path.join(temp_dir, "pump_noise.wav")
        
        self.save_audio(separated["animal"], animal_path)
        self.save_audio(separated["pump"], pump_path)
        
        return {
            "spectrogram": spectrogram,
            "animal_analysis": animal_analysis,
            "pump_analysis": pump_analysis,
            "separated_audio_paths": {
                "animal": animal_path,
                "pump": pump_path
            },
            "duration": float(len(y) / sr)
        }
