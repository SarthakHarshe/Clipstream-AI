#imports
from codecs import ignore_errors
import codecs
from configparser import Interpolation
from ctypes import resize
import enum
import glob
import json
from ntpath import exists
import pathlib
import pickle
import shutil
import subprocess
import time
from tracemalloc import start
import uuid
import modal  # Modal lets us run Python code in the cloud with GPUs
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials  # Handles API security with tokens
from fastapi import Depends, HTTPException, status  # FastAPI framework for building web APIs
from pydantic import BaseModel  # Helps validate and structure our data
import os
import boto3  # AWS SDK for talking to S3 storage
import whisperx
from google import genai
import numpy as np
from tqdm import tqdm
import cv2
import ffmpegcv
import pysubs2
import yt_dlp
import sqlite3
import tempfile


# This class defines what data we expect when someone wants to process a video
# like a form that users need to fill out
class ProcessVideoRequest(BaseModel):
    s3_key: str  # The file path/name of the video in S3 (like "videos/my_video.mp4")
    youtube_url: str | None = None  # Optional: YouTube URL if this is a YouTube job
    cookies_s3_key: str | None = None  # Optional: S3 key for cookies.txt if YouTube job
    generate_trailer: bool = False  # Whether to generate a trailer instead of individual clips

# We're building a custom computer environment that has all the tools we need
# like setting up a new computer with all the right software installed
image = (modal.Image.from_registry("nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.12")
        # Start with NVIDIA's image that has GPU support and add Python 3.12
        .apt_install(["ffmpeg","libgl1-mesa-glx", "wget", "libcudnn8", "libcudnn8-dev"])
        # Install system tools we need:
        # - ffmpeg: for working with video files
        # - libgl1-mesa-glx: for graphics support (some AI libraries need this)
        # - wget: for downloading files from the internet
        # - libcudnn8, libcudnn8-dev: NVIDIA's deep learning library for faster AI processing
        .pip_install_from_requirements("requirements.txt")
        # Install all the Python packages we need (PyTorch, OpenCV, etc.)
        .run_commands(["mkdir -p /usr/share/fonts/truetype/custom",
                       "wget -O /usr/share/fonts/truetype/custom/Anton-Regular.ttf https://fonts.gstatic.com/s/anton/v23/1Ptgg87LROyAm3Kz-Co.ttf",
                       "fc-cache -f -v"])
        # Set up fonts for video captioning:
        # 1. Create a folder for custom fonts
        # 2. Download the Anton font (used for putting text on videos)
        # 3. Tell the system about the new font
        .add_local_dir("asd", "/asd", copy=True))
        # Copy our AI model code and files to the cloud computer

# Create our main application - this is like creating a new app on Modal
app = modal.App("clipstream-ai", image=image)

# Set up permanent storage for AI models so we don't have to download them every time
volume = modal.Volume.from_name("clipstream-ai-model-cache", create_if_missing=True)
mount_path = "/root/.cache/torch"  # This is where PyTorch stores downloaded models

# Set up security - only people with the right token can use our service
auth_scheme = HTTPBearer()  # This checks for a "Bearer token" in the request

# Function to create vertical video with AI-generated camera movements
# This function takes tracking data and creates a vertical video optimized for social media
def create_vertical_video(tracks, scores, pyframes_path, pyavi_path, audio_path, output_path, framerate=25):
    target_width = 1080
    target_height = 1920

    flist = glob.glob(os.path.join(pyframes_path, "*.jpg"))
    flist.sort()

    faces = [[] for _ in range(len(flist))]

    for tidx, track in enumerate(tracks):
        score_array = scores[tidx]
        for fidx, frame in enumerate(track["track"]["frame"].tolist()):
            slice_start = max(fidx - 30, 0)
            slice_end = min(fidx + 30, len(score_array))
            score_slice = score_array[slice_start:slice_end]
            avg_score = float(np.mean(score_slice)
                              if len(score_slice) > 0 else 0)

            faces[frame].append(
                {'track': tidx, 'score': avg_score, 's': track['proc_track']["s"][fidx], 'x': track['proc_track']["x"][fidx], 'y': track['proc_track']["y"][fidx]})

    temp_video_path = os.path.join(pyavi_path, "video_only.mp4")

    vout = None
    for fidx, fname in tqdm(enumerate(flist), total=len(flist), desc="Creating vertical video"):
        img = cv2.imread(fname)
        if img is None:
            continue

        current_faces = faces[fidx]

        max_score_face = max(
            current_faces, key=lambda face: face['score']) if current_faces else None

        if max_score_face and max_score_face['score'] < 0:
            max_score_face = None

        if vout is None:
            vout = ffmpegcv.VideoWriterNV(
                file=temp_video_path,
                codec=None,
                fps=framerate,
                resize=(target_width, target_height)
            )

        if max_score_face:
            mode = "crop"
        else:
            mode = "resize"

        if mode == "resize":
            scale = target_width / img.shape[1]
            resized_height = int(img.shape[0] * scale)
            resized_image = cv2.resize(
                img, (target_width, resized_height), interpolation=cv2.INTER_AREA)

            scale_for_bg = max(
                target_width / img.shape[1], target_height / img.shape[0])
            bg_width = int(img.shape[1] * scale_for_bg)
            bg_heigth = int(img.shape[0] * scale_for_bg)

            blurred_background = cv2.resize(img, (bg_width, bg_heigth))
            blurred_background = cv2.GaussianBlur(
                blurred_background, (121, 121), 0)

            crop_x = (bg_width - target_width) // 2
            crop_y = (bg_heigth - target_height) // 2
            blurred_background = blurred_background[crop_y:crop_y +
                                                    target_height, crop_x:crop_x + target_width]

            center_y = (target_height - resized_height) // 2
            blurred_background[center_y:center_y +
                               resized_height, :] = resized_image

            vout.write(blurred_background)

        elif mode == "crop":
            scale = target_height / img.shape[0]
            resized_image = cv2.resize(
                img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            frame_width = resized_image.shape[1]

            center_x = int(
                max_score_face["x"] * scale if max_score_face else frame_width // 2)
            top_x = max(min(center_x - target_width // 2,
                        frame_width - target_width), 0)

            image_cropped = resized_image[0:target_height,
                                          top_x:top_x + target_width]

            vout.write(image_cropped)

    if vout:
        vout.release()

    ffmpeg_command = (f"ffmpeg -y -i {temp_video_path} -i {audio_path} "
                      f"-c:v h264 -preset fast -crf 23 -c:a aac -b:a 128k "
                      f"{output_path}")
    subprocess.run(ffmpeg_command, shell=True, check=True, text=True)

def create_subtitles_with_ffmpeg(transcript_segments: list, clip_start:float, clip_end: float,clip_video_path: str, output_path: str, max_words: int = 5):
    """
    Creates subtitles for a video clip using transcript segments and embeds them using ffmpeg.
    
    This function takes word-level transcript segments and groups them into subtitle lines
    that are displayed on the video. It creates an ASS subtitle file and then uses ffmpeg
    to burn the subtitles directly into the video.
    
    Args:
        transcript_segments: List of word segments with start/end times and text
        clip_start: Start time of the clip in seconds
        clip_end: End time of the clip in seconds  
        clip_video_path: Path to the input video file
        output_path: Path where the video with subtitles will be saved
        max_words: Maximum number of words per subtitle line (default: 5)
    """
    # Create temporary directory for subtitle files
    temp_dir= os.path.dirname(output_path)
    subtitle_path = os.path.join(temp_dir, "temp_subtitles.ass")

    # Filter transcript segments to only include words that fall within the clip timeframe
    # This ensures we only show subtitles for words that are actually spoken in this clip
    clip_segments = [segment for segment in transcript_segments 
                     if segment.get("start") is not None
                     and segment.get("end") is not None
                     and segment.get("end") > clip_start
                     and segment.get("start") < clip_end]
    
    # Initialize variables for building subtitle lines
    subtitles = []  # Final list of subtitle entries (start_time, end_time, text)
    current_words = []  # Words being collected for current subtitle line
    current_start = None  # Start time of current subtitle line
    current_end = None  # End time of current subtitle line

    # Process each word segment to group them into subtitle lines
    for segment in clip_segments:
        word = segment.get("word", "").strip()
        seg_start = segment.get("start")
        seg_end = segment.get("end")

        # Skip invalid segments (missing word or timestamps)
        if not word or seg_start is None or seg_end is None:
            continue
        
        # Convert absolute timestamps to relative timestamps within the clip
        # This ensures subtitles are timed correctly relative to the clip start
        start_rel = max(0.0, seg_start - clip_start)
        end_rel = max(0.0, seg_end - clip_start)

        # Skip words that end before the clip starts
        if end_rel <= 0:
            continue
        
        # If this is the first word, start a new subtitle line
        if not current_words:
            current_start = start_rel
            current_end = end_rel
            current_words = [word]
        # If we've reached the maximum words per line, finalize current line and start new one
        elif len(current_words) >= max_words:
            subtitles.append((current_start, current_end, ' '.join(current_words)))
            current_words = [word]
            current_start = start_rel
            current_end = end_rel
        # Otherwise, add word to current line and extend the end time
        else:
             current_words.append(word)
             current_end = end_rel

    # Don't forget to add the last subtitle line if there are remaining words
    if current_words:
        subtitles.append((current_start, current_end, ' '.join(current_words)))

    # Create ASS subtitle file using pysubs2 library
    # ASS (Advanced SubStation Alpha) is a subtitle format that supports rich styling
    subs = pysubs2.SSAFile()

    # Configure subtitle file metadata for vertical video format (1080x1920)
    subs.info["WrapStyle"] = 0  # No word wrapping
    subs.info["ScaledBorderAndShadow"] = "yes"  # Scale borders and shadows with video
    subs.info["PlayResX"] = 1080  # Video width
    subs.info["PlayResY"] = 1920  # Video height  
    subs.info["ScriptType"] = "v4.00+"  # ASS format version

    # Create subtitle styling for optimal readability on vertical videos
    style_name = "Default"
    new_style = pysubs2.SSAStyle()
    new_style.fontname = "Anton"
    new_style.fontsize = 140
    new_style.primarycolor = pysubs2.Color(255, 255, 255)
    new_style.outline = 2.0
    new_style.shadow = 2.0
    new_style.shadowcolor = pysubs2.Color(0, 0, 0, 128)
    new_style.alignment = 2
    new_style.marginl = 50
    new_style.marginr = 50
    new_style.marginv = 50
    new_style.spacing = 0.0

    # Apply the style to the subtitle file
    subs.styles[style_name] = new_style

    # Add each subtitle line to the file with proper timing
    for i, (start, end, text) in enumerate(subtitles):
        # Convert seconds to ASS time format (H:MM:SS.cc)
        start_time = pysubs2.make_time(s=start)
        end_time = pysubs2.make_time(s=end)
        # Create subtitle event with timing, text, and styling
        line = pysubs2.SSAEvent(start=start_time, end=end_time, text=text, style=style_name)
        subs.events.append(line)

    # Save the subtitle file to disk
    subs.save(subtitle_path)
        
    # Use ffmpeg to burn subtitles directly into the video
    # This creates a new video file with subtitles permanently embedded
    # -y: Overwrite output file if it exists
    # -i: Input video file
    # -vf "ass=subtitle_path": Apply ASS subtitle file as video filter
    # -c:v h264: Use H.264 video codec
    # -preset fast: Fast encoding preset for reasonable speed/quality balance
    # -crf 23: Constant Rate Factor for quality control (lower = better quality)
    ffmpeg_cmd = (f"ffmpeg -y -i {clip_video_path} -vf \"ass={subtitle_path}\" "
                  f"-c:v h264 -preset fast -crf 23 {output_path}")
    subprocess.run(ffmpeg_cmd, shell=True, check=True)


# Function to create a trailer from multiple moments
# This function combines the best moments from the video into a cohesive 60-second trailer
# with animated titles, transitions, and enhanced visual effects
def create_trailer(base_dir: pathlib.Path, original_video_path: pathlib.Path, s3_key: str, clip_moments: list, transcript_segments: list):
    """
    Create an AI-generated 60-second trailer that combines multiple short moments with animated titles.
    Uses a content-focused approach that respects natural moment durations.
    
    Args:
        base_dir: Base directory for processing
        original_video_path: Path to the original video file
        s3_key: S3 key for output naming (should be the folder where clips go)
        clip_moments: List of identified moments with start/end times
        transcript_segments: Word-level transcript segments
    """
    print(f"Creating content-focused trailer from {len(clip_moments)} moments...")
    
    # Create trailer directory structure
    trailer_dir = base_dir / "trailer"
    trailer_dir.mkdir(parents=True, exist_ok=True)
    
    # Content-focused selection: prioritize quality over rigid timing
    selected_moments = []
    total_content_duration = 0
    target_total_duration = 60  # Total target including titles/transitions
    max_content_duration = 50   # Allow 50 seconds for content, 10 for titles/transitions
    
    # Sort moments by duration to prioritize well-sized segments
    sorted_moments = sorted(clip_moments, key=lambda m: m["end"] - m["start"], reverse=True)
    
    for moment in sorted_moments:
        if total_content_duration >= max_content_duration:
            break
            
        original_duration = moment["end"] - moment["start"]
        
        # Content-focused rules:
        # 1. Include short impactful moments (5+ seconds) as-is
        # 2. Include medium moments (8-18 seconds) as-is  
        # 3. Only trim very long moments (18+ seconds) to preserve content flow
        # 4. Skip extremely short moments (under 4 seconds) that lack context
        
        if original_duration < 4:
            print(f"Skipping too-short moment: {original_duration:.1f}s")
            continue
        elif original_duration <= 18:
            # Keep natural duration - don't artificially cut good content
            adjusted_moment = moment.copy()
            final_duration = original_duration
            print(f"Including natural moment: {final_duration:.1f}s")
        else:
            # Only trim if really necessary (18+ seconds), but preserve the best part
            # Take first 15 seconds to keep the setup/question
            adjusted_moment = moment.copy()
            adjusted_moment["end"] = adjusted_moment["start"] + 15
            final_duration = 15
            print(f"Trimming long moment from {original_duration:.1f}s to {final_duration:.1f}s")
        
        # Check if adding this moment would exceed our budget
        if total_content_duration + final_duration <= max_content_duration:
            selected_moments.append(adjusted_moment)
            total_content_duration += final_duration
            print(f"Added moment: {final_duration:.1f}s (total: {total_content_duration:.1f}s)")
        else:
            # If we're close to the limit, try to fit a shorter remaining moment
            remaining_budget = max_content_duration - total_content_duration
            if remaining_budget >= 5 and final_duration > remaining_budget:
                # Trim this moment to fit the remaining budget
                adjusted_moment["end"] = adjusted_moment["start"] + remaining_budget
                selected_moments.append(adjusted_moment)
                total_content_duration += remaining_budget
                print(f"Final moment trimmed to fit: {remaining_budget:.1f}s")
                break
            else:
                print(f"Skipping moment - would exceed budget ({final_duration:.1f}s > {remaining_budget:.1f}s remaining)")
                continue
        
        # Stop if we have enough content (aim for 3-5 moments)
        if len(selected_moments) >= 5:
            break
    
    if not selected_moments:
        raise Exception("No suitable moments found for trailer")
    
    print(f"Selected {len(selected_moments)} moments with total duration: {total_content_duration:.1f}s")
    
    # Process each moment as a mini-clip
    processed_clips = []
    
    for idx, moment in enumerate(selected_moments):
        # Process this moment like a regular clip but store in trailer directory
        moment_clip_path = process_trailer_segment(
            trailer_dir, original_video_path, moment["start"], moment["end"], 
            idx, transcript_segments
        )
        
        if moment_clip_path and moment_clip_path.exists():
            processed_clips.append({
                "path": moment_clip_path,
                "start": moment["start"],
                "end": moment["end"],
                "index": idx,
                "duration": moment["end"] - moment["start"]
            })
    
    if not processed_clips:
        raise Exception("No valid clips generated for trailer")
    
    # Combine clips without any titles or overlays
    final_trailer_path = combine_clips_simple(trailer_dir, processed_clips, s3_key)
    
    return final_trailer_path

def process_trailer_segment(trailer_dir: pathlib.Path, original_video_path: pathlib.Path, start_time: float, end_time: float, segment_index: int, transcript_segments: list):
    """
    Process a single segment for the trailer (similar to process_clip but simplified).
    """
    segment_name = f"segment_{segment_index}"
    segment_dir = trailer_dir / segment_name
    segment_dir.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    pyframes_path = segment_dir / "pyframes"
    pyavi_path = segment_dir / "pyavi"
    pyframes_path.mkdir(exist_ok=True)
    pyavi_path.mkdir(exist_ok=True)
    
    # Extract segment
    segment_path = segment_dir / f"{segment_name}.mp4"
    duration = end_time - start_time
    cut_command = (f"ffmpeg -i {original_video_path} -ss {start_time} -t {duration} "
                   f"-c copy {segment_path}")
    subprocess.run(cut_command, shell=True, check=True, capture_output=True, text=True)
    
    # Extract audio
    audio_path = pyavi_path / "audio.wav"
    extract_cmd = f"ffmpeg -i {segment_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
    subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)
    
    # Copy for Columbia processing
    shutil.copy(segment_path, trailer_dir / f"{segment_name}.mp4")
    
    # Run Columbia AI model
    columbia_command = (f"python Columbia_test.py --videoName {segment_name} "
                        f"--videoFolder {str(trailer_dir)} "
                        f"--pretrainModel weight/finetuning_TalkSet.model")
    
    try:
        subprocess.run(columbia_command, cwd="/asd", shell=True, check=True)
    except Exception as e:
        print(f"Columbia processing failed for segment {segment_index}: {e}")
        return None
    
    # Load tracking data
    tracks_path = segment_dir / "pywork" / "tracks.pckl"
    scores_path = segment_dir / "pywork" / "scores.pckl"
    
    if not tracks_path.exists() or not scores_path.exists():
        print(f"Missing tracking data for segment {segment_index}")
        return None
    
    with open(tracks_path, "rb") as f:
        tracks = pickle.load(f)
    
    with open(scores_path, "rb") as f:
        scores = pickle.load(f)
    
    # Create vertical video
    vertical_video_path = pyavi_path / "vertical.mp4"
    create_vertical_video(tracks, scores, pyframes_path, pyavi_path, audio_path, vertical_video_path)
    
    # Add subtitles with shorter word limits for trailer
    subtitled_path = pyavi_path / "subtitled.mp4"
    create_subtitles_with_ffmpeg(transcript_segments, start_time, end_time, str(vertical_video_path), str(subtitled_path), max_words=2)
    
    return subtitled_path

def combine_clips_simple(trailer_dir: pathlib.Path, processed_clips: list, s3_key: str):
    """
    Simple combination of processed clips without any titles or overlays.
    """
    print("Combining clips into trailer...")
    
    # Create input list for concatenation
    input_list_path = trailer_dir / "input_list.txt"
    with open(input_list_path, "w") as f:
        for clip_info in processed_clips:
            f.write(f"file '{clip_info['path']}'\n")
    
    # Final output setup
    output_s3_key = f"{s3_key}/trailer.mp4"
    final_trailer_path = trailer_dir / "final_trailer.mp4"
    
    # Combine clips with smooth fade transitions
    concat_command = (f"ffmpeg -f concat -safe 0 -i {input_list_path} "
                      f"-filter_complex \"[0:v]fade=in:0:30,fade=out:st=57:d=3[v]\" "
                      f"-map \"[v]\" -map 0:a -c:v h264 -preset fast -crf 23 -c:a aac "
                      f"-t 60 {final_trailer_path}")
    
    subprocess.run(concat_command, shell=True, check=True)
    
    # Upload to S3
    s3_client = boto3.client("s3")
    s3_client.upload_file(str(final_trailer_path), "clipstream-ai", output_s3_key)
    
    print(f"Trailer uploaded to S3: {output_s3_key}")
    return output_s3_key



# Function to process individual video clips
# This function handles the complete pipeline for creating a single clip:
# 1. Extracts the clip segment from the original video
# 2. Runs Columbia AI model for face tracking and scoring
# 3. Creates vertical video with AI-generated camera movements
# 4. Adds subtitles and finalizes the clip
def process_clip(base_dir: pathlib.Path, original_video_path: pathlib.Path, s3_key: str, start_time: float, end_time: float, clip_index: int, transcript_segments: list):
    # Create unique clip name and S3 output path
    clip_name = f"clip_{clip_index}"
    # s3_key is already the folder path (e.g., "uuid"), not a full file path
    output_s3_key = f"{s3_key}/{clip_name}.mp4"

    # Create directory structure for this clip
    clip_dir = base_dir / clip_name
    clip_dir.mkdir(parents=True, exist_ok=True)

    # Define all the file paths we'll need for processing
    clip_segment_path = clip_dir / f"{clip_name}_segment.mp4"  # Original clip segment
    vertical_mp4_path = clip_dir / "pyavi" / "video_out_vertical.mp4"  # Final vertical video
    subtitle_output_path = clip_dir / "pyavi" / "video_with_subtitles.mp4"  # Video with subtitles

    # Create subdirectories for Columbia AI processing
    (clip_dir / "pywork").mkdir(exist_ok=True)  # Working directory for Columbia
    pyframes_path = clip_dir / "pyframes"  # Directory for extracted frames
    pyavi_path = clip_dir / "pyavi"  # Directory for video outputs
    audio_path = clip_dir / "pyavi" / "audio.wav"  # Extracted audio

    pyframes_path.mkdir(exist_ok=True)
    pyavi_path.mkdir(exist_ok=True)

    # Step 1: Extract the clip segment from the original video using ffmpeg
    duration = end_time - start_time
    cut_command = (f"ffmpeg -i {original_video_path} -ss {start_time} -t {duration} "
                   f"{clip_segment_path}")
    subprocess.run(cut_command, shell=True, check=True, capture_output=True, text=True)

    # Step 2: Extract audio from the clip segment
    extract_cmd = f"ffmpeg -i {clip_segment_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
    subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)

    # Copy the clip segment to the base directory for Columbia processing
    shutil.copy(clip_segment_path, base_dir / f"{clip_name}.mp4")

    # Step 3: Run Columbia AI model for face tracking and scoring
    # This model analyzes the video to track faces and generate camera movement scores
    columbia_command = (f"python Columbia_test.py --videoName {clip_name} "
                        f"--videoFolder {str(base_dir)} "
                        f"--pretrainModel weight/finetuning_TalkSet.model")
    
    columbia_start_time = time.time()
    subprocess.run(columbia_command, cwd="/asd", shell=True)
    columbia_end_time  = time.time()
    print(f"Columbia script completed in {columbia_end_time - columbia_start_time:.2f} seconds")

    # Step 4: Load the tracking and scoring data generated by Columbia
    tracks_path = clip_dir / "pywork" / "tracks.pckl"
    scores_path = clip_dir / "pywork" / "scores.pckl"
    
    if not tracks_path.exists() or not scores_path.exists():
        raise FileNotFoundError("Tracks or scores not found for clip")

    # Load the pickle files containing face tracking and scoring data
    with open(tracks_path, "rb") as f:
        tracks = pickle.load(f)
    
    with open(scores_path, "rb") as f:
        scores = pickle.load(f)

    # Step 5: Create vertical video with AI-generated camera movements
    cvv_start_time = time.time()
    create_vertical_video(tracks, scores, pyframes_path, pyavi_path, audio_path, vertical_mp4_path)
    cvv_end_time = time.time()

    print(f"Clip {clip_index} vertical video creation time: {cvv_end_time - cvv_start_time:.2f} seconds")

    # Step 6: Add subtitles to the vertical video
    # This creates a final video with embedded subtitles for better accessibility and engagement
    create_subtitles_with_ffmpeg(transcript_segments, start_time, end_time, str(vertical_mp4_path), str(subtitle_output_path), max_words=5)
    
    try:
        s3_client = boto3.client("s3")
        s3_client.upload_file(subtitle_output_path, "clipstream-ai", output_s3_key)
    except Exception as e:
        print(f"[ERROR] S3 upload failed: {e}")


# This is our main AI processing service that runs in the cloud
@app.cls(gpu="L40S", timeout=900, retries=0, scaledown_window=20, secrets=[modal.Secret.from_name("clipstream-ai-secret")], volumes={mount_path: volume})
class clipstream_ai:
    # Configuration for our cloud service:
    # - gpu="L40S": Use a powerful NVIDIA L40S GPU for fast AI processing
    # - timeout=900: Allow up to 15 minutes for processing (videos can take time)
    # - retries=0: Don't retry if something goes wrong
    # - scaledown_window=20: Keep the service running for 20 seconds after last request
    # - secrets: Access to our stored secrets (like API keys)
    # - volumes: Use our permanent storage for AI models
    
    @modal.enter()
    def load_model(self):
        # This runs once when our service starts up
        # It's like turning on a computer and loading all the programs we need
        print("Loading models")
        
        # Load WhisperX model for speech transcription
        # This model can transcribe speech with high accuracy and word-level timestamps
        self.whisperx_model = whisperx.load_model("large-v2", device="cuda", compute_type="float16")

        # Load alignment model for precise word-level timing
        # This ensures our transcriptions have accurate start/end times for each word
        self.alignment_model, self.metadata = whisperx.load_align_model(language_code="en", device="cuda")

        print("Transcription models loaded...")

        # Initialize Google Gemini AI client for content analysis
        # This will be used to identify interesting moments in the transcript
        print("Creating gemini client...")
        self.gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        print("Created gemini client...")

    # Function to transcribe the video using WhisperX
    # This extracts audio from the video and creates a detailed transcript with word-level timestamps
    def transcribe_video(self, base_dir: pathlib.Path, video_path: pathlib.Path) -> str:
        # Extract audio from video using ffmpeg
        # Convert to 16kHz mono WAV format for optimal transcription
        audio_path = base_dir / "audio.wav"
        extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
        subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)

        print("Starting transcription with WhisperX...")
        start_time = time.time()

        # Load audio and transcribe with WhisperX
        audio = whisperx.load_audio(str(audio_path))
        result = self.whisperx_model.transcribe(audio, batch_size=16)

        # Align the transcription for precise word-level timing
        result = whisperx.align(result["segments"], self.alignment_model, self.metadata, audio, device="cuda", return_char_alignments=False)

        duration = time.time() - start_time
        print("Transcription and alignment took " + str(duration) + "seconds")

        # Extract word-level segments with timestamps
        # This creates a list of words with their start/end times
        segments = []

        if "word_segments" in result:
            for word_segment in result["word_segments"]:
                segments.append({
                    "start": word_segment["start"],
                    "end": word_segment["end"],
                    "word": word_segment["word"],
                })
        
        return json.dumps(segments)

    
    # Function to identify interesting moments in the transcript using Gemini AI
    # This analyzes the transcript to find question-answer pairs and stories suitable for clips
    def identify_moments(self, transcript: dict):
        try:
            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash", 
                contents="""
    This is a podcast video transcript consisting of word, along with each words's start and end time. I am looking to create clips between a minimum of 30 and maximum of 60 seconds long. The clip should never exceed 60 seconds.

    Your task is to find and extract stories, or question and their corresponding answers from the transcript.
    Each clip should begin with the question and conclude with the answer.
    It is acceptable for the clip to include a few additional sentences before a question if it aids in contextualizing the question.

    Please adhere to the following rules:
    - Ensure that clips do not overlap with one another.
    - Start and end timestamps of the clips should align perfectly with the sentence boundaries in the transcript.
    - Only use the start and end timestamps provided in the input. modifying timestamps is not allowed.
    - Format the output as a list of JSON objects, each representing a clip with 'start' and 'end' timestamps: [{"start": seconds, "end": seconds}, ...clip2, clip3]. The output should always be readable by the python json.loads function.
    - Aim to generate longer clips between 40-60 seconds, and ensure to include as much content from the context as viable.

    Avoid including:
    - Moments of greeting, thanking, or saying goodbye.
    - Non-question and answer interactions.

    If there are no valid clips to extract, the output should be an empty list [], in JSON format. Also readable by json.loads() in Python.

    The transcript is as follows:\n\n""" + str(transcript)
            )
            print(f"Identified moments response: {response.text}")
            return response.text
        except Exception as e:
            print(f"[ERROR] Gemini API call failed for clips: {e}")
            return "[]"
    
    # Function to identify trailer moments - optimized for shorter, impactful segments
    def identify_trailer_moments(self, transcript: dict):
        try:
            # For very long transcripts (>1000 words), limit to first 30 minutes of content
            # to avoid overwhelming Gemini and reduce processing time
            transcript_str = str(transcript)
            if len(transcript) > 1000:
                print(f"Large transcript detected ({len(transcript)} words), limiting to first 30 minutes...")
                # Find words around 30-minute mark (1800 seconds)
                limited_transcript = [word for word in transcript if word.get("start", 0) <= 1800]
                transcript_str = str(limited_transcript)
                print(f"Reduced transcript to {len(limited_transcript)} words")
            
            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents="""
    This is a podcast video transcript with word-level timestamps. I need to create a 60-second AI trailer that showcases the most engaging highlights.

    Your task: Find 4-6 SHORT, IMPACTFUL moments (8-15 seconds each) that would make viewers want to watch the full video.

    Focus on:
    - Surprising revelations or "wow" moments
    - Emotional peaks (excitement, shock, laughter)
    - Controversial or thought-provoking statements
    - Memorable quotes or one-liners
    - Key insights or breakthrough moments
    - Dramatic story moments or cliffhangers

    Rules:
    - Each moment must be 8-15 seconds (no longer, no shorter)
    - Moments should NOT overlap
    - Use exact timestamps from the transcript
    - Prioritize standalone moments that don't need context
    - Avoid greetings, thanks, or mundane conversation
    - Select moments that create curiosity or emotional impact

    Output format: [{"start": seconds, "end": seconds}, {"start": seconds, "end": seconds}, ...]
    Must be valid JSON readable by json.loads()

    If no suitable moments found, return: []

    Transcript:\n\n""" + transcript_str
            )
            print(f"Identified trailer moments response: {response.text}")
            return response.text
        except Exception as e:
            print(f"[ERROR] Gemini API call failed for trailer: {e}")
            return "[]"

    @modal.fastapi_endpoint(method="POST")
    def process_video(self, request: ProcessVideoRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        # This is the main function that processes videos when someone calls our API
        # It's like a worker that takes a video and does AI magic on it
        
        # Get the video file path from the request
        s3_key = request.s3_key
        youtube_url = request.youtube_url
        cookies_s3_key = request.cookies_s3_key
        generate_trailer = request.generate_trailer

        # Check if the user has permission to use our service
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
                                detail="Incorrect bearer token", headers={"WWW-Authenticate": "Bearer"})
        
        # Create a unique folder for this video processing job
        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        video_path = base_dir / "input.mp4"
        cookies_path = None
        
        # Determine the S3 key for clips - use original s3_key directory for consistency with frontend
        s3_key_dir = os.path.dirname(s3_key)
        clips_s3_key = s3_key_dir
        
        if youtube_url and cookies_s3_key:
            # Download cookies file from S3 to a temp file
            s3_client = boto3.client("s3")
            
            # Verify cookies file exists before attempting download
            try:
                s3_client.head_object(Bucket="clipstream-ai", Key=cookies_s3_key)
                print(f"[DEBUG] Cookies file found in S3: {cookies_s3_key}")
            except Exception as e:
                print(f"[ERROR] Cookies file not found in S3: {cookies_s3_key} - {e}")
                # Update status to failed with specific error
                try:
                    import requests
                    requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                                json={"s3_key": s3_key, "status": "failed", "error": "Cookies file missing. Please upload a fresh cookies.txt file."}, timeout=10)
                except:
                    pass
                raise HTTPException(status_code=400, detail="Cookies file missing. Please upload a fresh cookies.txt file.")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp:
                try:
                    s3_client.download_fileobj("clipstream-ai", cookies_s3_key, tmp)
                    cookies_path = tmp.name
                    print(f"[DEBUG] Successfully downloaded cookies to: {cookies_path}")
                except Exception as e:
                    print(f"[ERROR] Failed to download cookies file: {e}")
                    # Update status to failed with specific error
                    try:
                        import requests
                        requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                                    json={"s3_key": s3_key, "status": "failed", "error": "Failed to access cookies file. Please upload a fresh cookies.txt file."}, timeout=10)
                    except:
                        pass
                    raise HTTPException(status_code=400, detail="Failed to access cookies file. Please upload a fresh cookies.txt file.")
                    
            try:
                ydl_opts = {
                    'outtmpl': str(video_path),
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
                    'merge_output_format': 'mp4',
                    'quiet': True,
                    'noplaylist': True,
                    'max_filesize': 600 * 1024 * 1024,
                }
                if cookies_path:
                    ydl_opts['cookiefile'] = cookies_path
                    print(f"[DEBUG] Using cookies file for YouTube download")
                else:
                    print("[WARNING] No cookies file provided for YouTube download")
                    
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(youtube_url, download=True)
                    duration = info.get('duration', 0)
                    if duration > 60 * 60:
                        raise Exception("Video too long (max 1 hour)")
                    print(f"[DEBUG] Successfully downloaded YouTube video: {youtube_url}")
            except Exception as e:
                print(f"[ERROR] YouTube download failed: {e}")
                shutil.rmtree(base_dir, ignore_errors=True)
                # Update status to failed with specific error
                try:
                    import requests
                    requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                                json={"s3_key": s3_key, "status": "failed", "error": f"YouTube download failed: {str(e)}. Please ensure your cookies are fresh and try again."}, timeout=10)
                except:
                    pass
                raise HTTPException(status_code=400, detail=f"YouTube download failed: {e}")
            finally:
                if cookies_path:
                    try:
                        os.remove(cookies_path)
                        print(f"[DEBUG] Deleted temp cookies file: {cookies_path}")
                    except Exception:
                        pass
                # Note: Cookies file deletion from S3 may fail due to permissions
                # This is expected and doesn't affect functionality
                if cookies_s3_key:
                    try:
                        s3_client.delete_object(Bucket="clipstream-ai", Key=cookies_s3_key)
                        print(f"[DEBUG] Deleted cookies file from S3: {cookies_s3_key}")
                    except Exception as e:
                        print(f"[INFO] Could not delete cookies file from S3 (expected if no delete permissions): {e}")
        elif youtube_url:
            # YouTube URL provided but no cookies - this should not happen with proper frontend validation
            print("[ERROR] YouTube URL provided but no cookies file")
            try:
                import requests
                requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                            json={"s3_key": s3_key, "status": "failed", "error": "Cookies file is required for YouTube downloads. Please upload your cookies.txt file."}, timeout=10)
            except:
                pass
            raise HTTPException(status_code=400, detail="Cookies file is required for YouTube downloads")
        else:
            s3_client = boto3.client("s3")
            s3_client.download_file("clipstream-ai", s3_key, str(video_path))

        transcript_segments_json = self.transcribe_video(base_dir, video_path)
        transcript_segments = json.loads(transcript_segments_json)

        # Use different Gemini prompts for clips vs trailers
        if generate_trailer:
            print("Using trailer-optimized prompt for moment identification...")
            identified_moments_raw = self.identify_trailer_moments(transcript_segments)
        else:
            print("Using clips-optimized prompt for moment identification...")
        identified_moments_raw = self.identify_moments(transcript_segments)

        cleaned_json_string = identified_moments_raw.strip()
        if cleaned_json_string.startswith("```json"):
            cleaned_json_string = cleaned_json_string[len("```json"):].strip()
        if cleaned_json_string.endswith("```"):
            cleaned_json_string = cleaned_json_string[:-len("```")].strip()

        try:
            clip_moments = json.loads(cleaned_json_string)
        except Exception as e:
            print(f"[ERROR] Failed to parse Gemini output: {e}")
            clip_moments = []
        if not isinstance(clip_moments, list):
            print("[ERROR] identified moments is not a list")
            clip_moments = []

        # Step 3: Process moments based on generation type
        processing_success = False
        
        if generate_trailer:
            # Create a single trailer combining multiple moments
            print("Generating AI trailer with transitions and effects...")
            try:
                if not clip_moments:
                    raise Exception("No moments identified by AI for trailer generation")
                trailer_s3_key = create_trailer(base_dir, video_path, clips_s3_key, clip_moments, transcript_segments)
                print(f"Trailer created successfully: {trailer_s3_key}")
                processing_success = True
            except Exception as e:
                print(f"[ERROR] Trailer generation failed: {e}")
                # Update status to failed in database via HTTP call to frontend
                try:
                    import requests
                    requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                                json={"s3_key": s3_key, "status": "failed", "error": str(e)}, timeout=10)
                except:
                    pass  # Don't fail if status update fails
        else:
            # Create individual clips (existing behavior)
            print("Generating individual clips...")
            clips_created = 0
            # Limit to first 3 clips to avoid overwhelming the system
            for index, moment in enumerate(clip_moments[:3]):
                if "start" in moment and "end" in moment:
                    try:
                        # Pass the full prefix for the clip
                        process_clip(base_dir, video_path, clips_s3_key, moment["start"], moment["end"], index, transcript_segments)
                        clips_created += 1
                    except Exception as e:
                        print(f"[ERROR] process_clip failed for clip {index}: {e}")
            
            if clips_created > 0:
                processing_success = True
            elif not clip_moments:
                print("[ERROR] No moments identified by AI for clip generation")
                try:
                    import requests
                    requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                                json={"s3_key": s3_key, "status": "failed", "error": "No suitable moments found in video"}, timeout=10)
                except:
                    pass
        
        # Mark as processed if successful and deduct credits
        if processing_success:
            try:
                import requests
                requests.post(f"{os.environ.get('FRONTEND_URL', 'https://clipstream-ai.vercel.app')}/api/update-status", 
                            json={"s3_key": s3_key, "status": "processed"}, timeout=10)
            except:
                pass
        
        # Clean up temporary files after processing
        if base_dir.exists():
            shutil.rmtree(base_dir, ignore_errors=True)


# This function lets us test our API from our local computer
@app.local_entrypoint()
def main():
    # Import the requests library for making HTTP calls
    import requests

    # Connect to our cloud service
    clipstreamai = clipstream_ai()

    # Get the web address where our API is running
    url = clipstreamai.process_video.web_url  

    # Prepare the test data - this is like filling out a form
    payload = {
        "s3_key": "test2/Blocks30mins.mp4"  # The video file we want to process
    }

    # Set up the request headers (like putting a stamp on an envelope)
    headers = {
        "Content-Type": "application/json",  # Tell the server we're sending JSON data
        "Authorization": "Bearer 123123"     # Our test password/token
    }

    # Send the request to our cloud service
    # This is like sending a letter asking "please process this video"
    response = requests.post(url, json=payload, headers=headers)
    
    # Check if everything worked (if not, this will show us the error)
    response.raise_for_status()
    
    # Get the response from our service
    result = response.json()
    
    # Show us what the service returned
    print(result)