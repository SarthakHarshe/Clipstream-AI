"""
ClipStream AI - Automated Video Processing and Clip Generation Service

This module provides a cloud-based video processing service that automatically:
- Transcribes video content using WhisperX
- Identifies engaging moments using Google Gemini AI
- Generates vertical video clips optimized for social media
- Creates AI-powered trailers with narrative flow
- Supports both direct video uploads and YouTube video processing

The service runs on Modal cloud infrastructure with GPU acceleration for
fast processing.

Author: ClipStream AI Team
License: Proprietary
"""

# Standard library imports
import glob
import json
import os
import pathlib
import pickle
import shutil
import subprocess
import tempfile
import time
import uuid

# Third-party imports
import boto3
import cv2
import ffmpegcv
import modal
import numpy as np
import pysubs2
import requests
import yt_dlp
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google import genai
from pydantic import BaseModel
from tqdm import tqdm
import whisperx


def send_webhook_notification(uploaded_file_id: str, s3_key: str, status: str, error_message: str = None):
    """
    Send webhook notification to the frontend about processing completion.
    
    Args:
        uploaded_file_id: ID of the uploaded file
        s3_key: S3 key of the processed video
        status: Processing status ("success" or "error")
        error_message: Error message if status is "error"
    """
    try:
        webhook_url = os.environ.get("WEBHOOK_URL")
        if not webhook_url:
            print(f"[Modal] Warning: WEBHOOK_URL not configured, skipping webhook for {uploaded_file_id}")
            return
            
        payload = {
            "uploaded_file_id": uploaded_file_id,
            "s3_key": s3_key,
            "status": status,
        }
        
        if error_message:
            payload["error_message"] = error_message
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ['AUTH_TOKEN']}"
        }
        
        print(f"[Modal] Sending webhook to {webhook_url} for {uploaded_file_id} with status {status}")
        response = requests.post(webhook_url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            print(f"[Modal] Webhook sent successfully for {uploaded_file_id}")
        else:
            print(f"[Modal] Webhook failed for {uploaded_file_id}: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"[Modal] Error sending webhook for {uploaded_file_id}: {e}")


class ProcessVideoRequest(BaseModel):
    """
    Request model for video processing operations.

    This model defines the structure and validation rules for incoming
    video processing requests, supporting both direct uploads and YouTube URLs.

    Attributes:
        s3_key: S3 object key for the video file (e.g.,
               "videos/uuid/filename.mp4")
        youtube_url: Optional YouTube URL for processing YouTube videos
        cookies_s3_key: Optional S3 key for cookies.txt file (required for
                        YouTube processing)
        generate_trailer: Flag to generate a trailer instead of individual clips
        uploaded_file_id: ID of the uploaded file for webhook callback
    """
    s3_key: str
    youtube_url: str | None = None
    cookies_s3_key: str | None = None
    generate_trailer: bool = False
    uploaded_file_id: str


# Modal cloud infrastructure configuration
# Creates a custom container image with all required dependencies
image = (modal.Image.from_registry(
    "nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.12")
        .apt_install([
            "ffmpeg",           # Video processing and manipulation
            "libgl1-mesa-glx",  # OpenGL libraries for computer vision
            "wget",             # File downloading utility
            "libcudnn8",        # NVIDIA cuDNN for deep learning acceleration
            "libcudnn8-dev"     # Development headers for cuDNN
        ])
        .pip_install_from_requirements("requirements.txt")
        .run_commands([
            "mkdir -p /usr/share/fonts/truetype/custom",
            "wget -O /usr/share/fonts/truetype/custom/Anton-Regular.ttf https://fonts.gstatic.com/s/anton/v23/1Ptgg87LROyAm3Kz-Co.ttf",
            "fc-cache -f -v"
        ])
        .add_local_dir("asd", "/asd", copy=True))

# Initialize Modal application
app = modal.App("clipstream-ai", image=image)

# Persistent storage for AI models to avoid repeated downloads
volume = modal.Volume.from_name("clipstream-ai-model-cache", create_if_missing=True)
mount_path = "/root/.cache/torch"

# Authentication scheme for API security
auth_scheme = HTTPBearer()


def create_vertical_video(tracks, scores, pyframes_path, pyavi_path,
                         audio_path, output_path, framerate=25):
    """
    Creates a vertical video optimized for social media platforms.

    This function processes face tracking data to generate intelligent camera
    movements that follow the most engaging speaker in the video. It creates a
    1080x1920 vertical format video with smooth transitions and professional
    visual effects.

    Args:
        tracks: List of face tracking data from Columbia AI model
        scores: List of engagement scores for each tracked face
        pyframes_path: Path to directory containing extracted video frames
        pyavi_path: Path to directory for video output files
        audio_path: Path to the extracted audio file
        output_path: Path where the final vertical video will be saved
        framerate: Target framerate for the output video (default: 25 fps)

    Returns:
        None. The processed video is saved to output_path.

    Raises:
        FileNotFoundError: If required input files are missing
        subprocess.CalledProcessError: If ffmpeg processing fails
    """
    # Target dimensions for vertical social media format (9:16 aspect ratio)
    target_width = 1080
    target_height = 1920

    # Get sorted list of frame files
    flist = glob.glob(os.path.join(pyframes_path, "*.jpg"))
    flist.sort()

    # Initialize face tracking data for each frame
    faces = [[] for _ in range(len(flist))]

    # Process tracking data to calculate average engagement scores
    for tidx, track in enumerate(tracks):
        score_array = scores[tidx]
        for fidx, frame in enumerate(track["track"]["frame"].tolist()):
            # Calculate average score over a 60-frame window (±30 frames)
            slice_start = max(fidx - 30, 0)
            slice_end = min(fidx + 30, len(score_array))
            score_slice = score_array[slice_start:slice_end]
            avg_score = float(np.mean(score_slice)
                          if len(score_slice) > 0 else 0)

            # Store face data with position and engagement score
            faces[frame].append({
                'track': tidx,
                'score': avg_score,
                's': track['proc_track']["s"][fidx],
                'x': track['proc_track']["x"][fidx],
                'y': track['proc_track']["y"][fidx]
            })

    # Temporary video path for processing
    temp_video_path = os.path.join(pyavi_path, "video_only.mp4")

    # Initialize video writer
    vout = None

    # Process each frame to create vertical video
    for fidx, fname in tqdm(enumerate(flist), total=len(flist),
                            desc="Creating vertical video"):
        img = cv2.imread(fname)
        if img is None:
            continue

        current_faces = faces[fidx]

        # Find the face with the highest engagement score
        max_score_face = (max(current_faces, key=lambda face: face['score'])
                          if current_faces else None)

        # Filter out low-engagement faces
        if max_score_face and max_score_face['score'] < 0:
            max_score_face = None

        # Initialize video writer on first frame
        if vout is None:
            vout = ffmpegcv.VideoWriterNV(
                file=temp_video_path,
                codec=None,
                fps=framerate,
                resize=(target_width, target_height)
            )

        # Choose processing mode based on face detection
        mode = "crop" if max_score_face else "resize"

        if mode == "resize":
            # Resize mode: Scale video to fit vertical format with blurred
            # background
            scale = target_width / img.shape[1]
            resized_height = int(img.shape[0] * scale)
            resized_image = cv2.resize(img, (target_width, resized_height),
                                       interpolation=cv2.INTER_AREA)

            # Create blurred background by scaling and blurring the original
            # image
            scale_for_bg = max(target_width / img.shape[1],
                               target_height / img.shape[0])
            bg_width = int(img.shape[1] * scale_for_bg)
            bg_height = int(img.shape[0] * scale_for_bg)

            blurred_background = cv2.resize(img, (bg_width, bg_height))
            blurred_background = cv2.GaussianBlur(blurred_background,
                                                  (121, 121), 0)

            # Center crop the background to target dimensions
            crop_x = (bg_width - target_width) // 2
            crop_y = (bg_height - target_height) // 2
            blurred_background = blurred_background[
                crop_y:crop_y + target_height, crop_x:crop_x + target_width]

            # Center the resized image on the blurred background
            center_y = (target_height - resized_height) // 2
            blurred_background[center_y:center_y + resized_height,
                               :] = resized_image

            vout.write(blurred_background)

        elif mode == "crop":
            # Crop mode: Follow the most engaging face with intelligent
            # cropping
            scale = target_height / img.shape[0]
            resized_image = cv2.resize(img, None, fx=scale, fy=scale,
                                       interpolation=cv2.INTER_AREA)
            frame_width = resized_image.shape[1]

            # Calculate center position based on face location
            center_x = int(max_score_face["x"] * scale
                           if max_score_face else frame_width // 2)
            top_x = max(min(center_x - target_width // 2,
                            frame_width - target_width), 0)

            # Crop the frame to target dimensions
            image_cropped = resized_image[0:target_height,
                                          top_x:top_x + target_width]
            vout.write(image_cropped)

    # Release video writer
    if vout:
        vout.release()

    # Combine video with audio using ffmpeg
    ffmpeg_command = (f"ffmpeg -y -i {temp_video_path} -i {audio_path} "
                      f"-c:v h264 -preset fast -crf 23 -c:a aac "
                      f"-b:a 128k {output_path}")
    subprocess.run(ffmpeg_command, shell=True, check=True, text=True)

def create_subtitles_with_ffmpeg(transcript_segments: list,
                                  clip_start: float, clip_end: float,
                                  clip_video_path: str, output_path: str,
                                  max_words: int = 5):
    """
    Creates and embeds subtitles into video clips using transcript data.

    This function processes word-level transcript segments to create
    professional subtitles that are burned directly into the video. It groups
    words into readable lines and applies styling optimized for vertical video
    format.

    Args:
        transcript_segments: List of word segments with start/end times and text
        clip_start: Start time of the clip in seconds
        clip_end: End time of the clip in seconds
        clip_video_path: Path to the input video file
        output_path: Path where the video with subtitles will be saved
        max_words: Maximum number of words per subtitle line (default: 5)

    Returns:
        None. The processed video with embedded subtitles is saved to output_path.

    Raises:
        subprocess.CalledProcessError: If ffmpeg subtitle embedding fails
    """
    # Create temporary directory for subtitle files
    temp_dir = os.path.dirname(output_path)
    subtitle_path = os.path.join(temp_dir, "temp_subtitles.ass")

    # Filter transcript segments to only include words within the clip
    # timeframe
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
        # If we've reached the maximum words per line, finalize current line
        # and start new one
        elif len(current_words) >= max_words:
            subtitles.append((current_start, current_end,
                              ' '.join(current_words)))
            current_words = [word]
            current_start = start_rel
            current_end = end_rel
        # Otherwise, add word to current line and extend the end time
        else:
            current_words.append(word)
            current_end = end_rel

    # Add the last subtitle line if there are remaining words
    if current_words:
        subtitles.append((current_start, current_end,
                          ' '.join(current_words)))

    # Create ASS subtitle file using pysubs2 library
    # ASS (Advanced SubStation Alpha) supports rich styling and positioning
    subs = pysubs2.SSAFile()

    # Configure subtitle file metadata for vertical video format (1080x1920)
    subs.info["WrapStyle"] = 0  # No word wrapping
    subs.info["ScaledBorderAndShadow"] = "yes"  # Scale borders/shadows
    subs.info["PlayResX"] = 1080  # Video width
    subs.info["PlayResY"] = 1920  # Video height
    subs.info["ScriptType"] = "v4.00+"  # ASS format version

    # Create subtitle styling for optimal readability on vertical videos
    style_name = "Default"
    new_style = pysubs2.SSAStyle()
    new_style.fontname = "Anton"  # Professional font for social media
    new_style.fontsize = 140  # Large font size for mobile viewing
    new_style.primarycolor = pysubs2.Color(255, 255, 255)  # White text
    new_style.outline = 2.0  # Text outline for contrast
    new_style.shadow = 2.0  # Drop shadow for readability
    new_style.shadowcolor = pysubs2.Color(0, 0, 0, 128)  # Semi-transparent
    # black shadow
    new_style.alignment = 2  # Center alignment
    new_style.marginl = 50  # Left margin
    new_style.marginr = 50  # Right margin
    new_style.marginv = 50  # Vertical margin
    new_style.spacing = 0.0  # No letter spacing

    # Apply the style to the subtitle file
    subs.styles[style_name] = new_style

    # Add each subtitle line to the file with proper timing
    for i, (start, end, text) in enumerate(subtitles):
        # Convert seconds to ASS time format (H:MM:SS.cc)
        start_time = pysubs2.make_time(s=start)
        end_time = pysubs2.make_time(s=end)
        # Create subtitle event with timing, text, and styling
        line = pysubs2.SSAEvent(start=start_time, end=end_time, text=text,
                                style=style_name)
        subs.events.append(line)

    # Save the subtitle file to disk
    subs.save(subtitle_path)

    # Use ffmpeg to burn subtitles directly into the video
    ffmpeg_cmd = (f"ffmpeg -y -i {clip_video_path} -vf \"ass={subtitle_path}\" "
                  f"-c:v h264 -preset fast -crf 23 {output_path}")
    subprocess.run(ffmpeg_cmd, shell=True, check=True)


def create_trailer(base_dir: pathlib.Path, original_video_path: pathlib.Path, s3_key: str, clip_moments: list, transcript_segments: list):
    """
    Creates an AI-generated 60-second trailer from multiple video moments.

    This function intelligently selects and combines the most engaging moments
    from a video to create a compelling trailer optimized for social media.
    It uses a narrative-focused approach that builds suspense and maintains
    viewer engagement throughout the trailer.

    Args:
        base_dir: Base directory for processing operations
        original_video_path: Path to the source video file
        s3_key: S3 key for output naming (folder path for clips)
        clip_moments: List of identified moments with start/end timestamps
        transcript_segments: Word-level transcript data for subtitle generation

    Returns:
        str: S3 key of the generated trailer file

    Raises:
        Exception: If no suitable moments are found or processing fails
    """
    print(f"Creating narrative-focused trailer from {len(clip_moments)} moments...")

    # Create trailer directory structure
    trailer_dir = base_dir / "trailer"
    trailer_dir.mkdir(parents=True, exist_ok=True)

    # Narrative-focused selection: prioritize story flow over rigid timing
    selected_moments = []
    total_content_duration = 0
    target_total_duration = 60  # Total target including transitions
    max_content_duration = 55   # Allow 55 seconds for content, 5 for transitions

    # Sort moments by start time to maintain chronological order for narrative flow
    sorted_moments = sorted(clip_moments, key=lambda m: m["start"])

    for moment in sorted_moments:
        if total_content_duration >= max_content_duration:
            break

        original_duration = moment["end"] - moment["start"]

        # Content-focused rules for variable-length moments:
        # 1. Keep short impactful moments (3-8 seconds) as-is for hooks and cliffhangers
        # 2. Keep medium moments (8-18 seconds) as-is for building tension
        # 3. Only trim very long moments (18+ seconds) to preserve content flow
        # 4. Skip extremely short moments (under 3 seconds) that lack context

        if original_duration < 3:
            print(f"Skipping too-short moment: {original_duration:.1f}s")
            continue
        elif original_duration <= 18:
            # Keep natural duration - don't artificially cut good content
            adjusted_moment = moment.copy()
            final_duration = original_duration
            print(f"Including natural moment: {final_duration:.1f}s")
        else:
            # Only trim if really necessary (18+ seconds), but preserve the best part
            # Take first 18 seconds to keep the setup and impact
            adjusted_moment = moment.copy()
            adjusted_moment["end"] = adjusted_moment["start"] + 18
            final_duration = 18
            print(f"Trimming long moment from {original_duration:.1f}s to {final_duration:.1f}s")

        # Check if adding this moment would exceed our budget
        if total_content_duration + final_duration <= max_content_duration:
            selected_moments.append(adjusted_moment)
            total_content_duration += final_duration
            print(f"Added moment: {final_duration:.1f}s (total: {total_content_duration:.1f}s)")
        else:
            # If we're close to the limit, try to fit a shorter remaining moment
            remaining_budget = max_content_duration - total_content_duration
            if remaining_budget >= 3 and final_duration > remaining_budget:
                # Trim this moment to fit the remaining budget
                adjusted_moment["end"] = adjusted_moment["start"] + remaining_budget
                selected_moments.append(adjusted_moment)
                total_content_duration += remaining_budget
                print(f"Final moment trimmed to fit: {remaining_budget:.1f}s")
                break
            else:
                print(f"Skipping moment - would exceed budget ({final_duration:.1f}s > {remaining_budget:.1f}s remaining)")
                continue

        # Stop if we have enough content (aim for 4-6 moments for good narrative flow)
        if len(selected_moments) >= 6:
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

    # Combine clips with improved transitions for better narrative flow
    final_trailer_path = combine_clips_with_narrative_flow(trailer_dir, processed_clips, s3_key)

    return final_trailer_path

def process_trailer_segment(trailer_dir: pathlib.Path, original_video_path: pathlib.Path, start_time: float, end_time: float, segment_index: int, transcript_segments: list):
    """
    Processes a single video segment for trailer generation.

    This function handles the complete pipeline for creating a trailer segment,
    including video extraction, face tracking, vertical video creation, and
    subtitle generation. It's optimized for trailer segments with shorter
    subtitle lines for better readability.

    Args:
        trailer_dir: Directory for trailer processing operations
        original_video_path: Path to the source video file
        start_time: Start time of the segment in seconds
        end_time: End time of the segment in seconds
        segment_index: Index of the segment for naming purposes
        transcript_segments: Word-level transcript data for subtitles

    Returns:
        pathlib.Path: Path to the processed segment video with subtitles, or None if processing fails

    Raises:
        subprocess.CalledProcessError: If video processing commands fail
        FileNotFoundError: If required tracking data is missing
    """
    segment_name = f"segment_{segment_index}"
    segment_dir = trailer_dir / segment_name
    segment_dir.mkdir(parents=True, exist_ok=True)

    # Create subdirectories for processing
    pyframes_path = segment_dir / "pyframes"
    pyavi_path = segment_dir / "pyavi"
    pyframes_path.mkdir(exist_ok=True)
    pyavi_path.mkdir(exist_ok=True)

    # Extract video segment from original video
    segment_path = segment_dir / f"{segment_name}.mp4"
    duration = end_time - start_time
    cut_command = (f"ffmpeg -i {original_video_path} -ss {start_time} -t {duration} "
                   f"-c copy {segment_path}")
    subprocess.run(cut_command, shell=True, check=True, capture_output=True, text=True)

    # Extract audio for processing
    audio_path = pyavi_path / "audio.wav"
    extract_cmd = f"ffmpeg -i {segment_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
    subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)

    # Copy segment for Columbia AI processing
    shutil.copy(segment_path, trailer_dir / f"{segment_name}.mp4")

    # Run Columbia AI model for face tracking and engagement scoring
    columbia_command = (f"python Columbia_test.py --videoName {segment_name} "
                        f"--videoFolder {str(trailer_dir)} "
                        f"--pretrainModel weight/finetuning_TalkSet.model")

    try:
        subprocess.run(columbia_command, cwd="/asd", shell=True, check=True)
    except Exception as e:
        print(f"Columbia processing failed for segment {segment_index}: {e}")
        return None

    # Load face tracking and engagement data
    tracks_path = segment_dir / "pywork" / "tracks.pckl"
    scores_path = segment_dir / "pywork" / "scores.pckl"

    if not tracks_path.exists() or not scores_path.exists():
        print(f"Missing tracking data for segment {segment_index}")
        return None

    with open(tracks_path, "rb") as f:
        tracks = pickle.load(f)

    with open(scores_path, "rb") as f:
        scores = pickle.load(f)

    # Create vertical video with AI-generated camera movements
    vertical_video_path = pyavi_path / "vertical.mp4"
    create_vertical_video(tracks, scores, pyframes_path, pyavi_path, audio_path, vertical_video_path)

    # Add subtitles with shorter word limits for trailer (better for quick reading)
    subtitled_path = pyavi_path / "subtitled.mp4"
    create_subtitles_with_ffmpeg(transcript_segments, start_time, end_time, str(vertical_video_path), str(subtitled_path), max_words=3)

    return subtitled_path

def combine_clips_with_narrative_flow(trailer_dir: pathlib.Path, processed_clips: list, s3_key: str):
    """
    Combines video clips with sophisticated transitions for narrative flow.

    This function creates a professional trailer by combining multiple clips
    with smooth crossfades, fade-ins, and fade-outs that build suspense and
    maintain viewer engagement. It includes fallback mechanisms for complex
    filter failures.

    Args:
        trailer_dir: Directory containing processed clip files
        processed_clips: List of dictionaries containing clip information
        s3_key: S3 key prefix for the output trailer file

    Returns:
        str: S3 key of the uploaded trailer file

    Raises:
        subprocess.CalledProcessError: If video processing fails
        Exception: If S3 upload fails
    """
    print("Combining clips into trailer with narrative flow...")

    # Create input list for concatenation
    input_list_path = trailer_dir / "input_list.txt"
    with open(input_list_path, "w") as f:
        for clip_info in processed_clips:
            f.write(f"file '{clip_info['path']}'\n")

    # Final output setup
    output_s3_key = f"{s3_key}/trailer.mp4"
    final_trailer_path = trailer_dir / "final_trailer.mp4"

    # Calculate total duration for proper fade timing
    total_duration = sum(clip_info['duration'] for clip_info in processed_clips)

    # Create sophisticated transitions for narrative flow:
    # - Quick fade-in for opening hook
    # - Smooth crossfades between tension-building moments
    # - Dramatic fade-out for cliffhanger ending

    # Build complex filter for better transitions
    filter_complex = []
    input_count = len(processed_clips)

    # Add fade-in to first clip (quick attention grabber)
    filter_complex.append(f"[0:v]fade=in:0:0.5[v0]")

    # Add crossfades between clips for smooth narrative flow
    for i in range(1, input_count):
        # Crossfade between clips with 0.3s overlap
        filter_complex.append(f"[{i}:v]fade=in:0:0.3[v{i}]")
        if i == 1:
            filter_complex.append(f"[v0][v1]xfade=transition=fade:duration=0.3:offset={processed_clips[0]['duration']-0.3}[tmp1]")
        else:
            filter_complex.append(f"[tmp{i-1}][v{i}]xfade=transition=fade:duration=0.3:offset={sum(clip['duration'] for clip in processed_clips[:i])-0.3}[tmp{i}]")

    # Add dramatic fade-out to last clip (cliffhanger effect)
    last_clip_duration = processed_clips[-1]['duration']
    filter_complex.append(f"[tmp{input_count-1}]fade=out:st={last_clip_duration-1}:d=1[v]")

    # Combine audio with crossfades
    audio_filter = []
    for i in range(input_count):
        audio_filter.append(f"[{i}:a]afade=in:0:0.3[a{i}]")

    # Crossfade audio
    for i in range(1, input_count):
        if i == 1:
            audio_filter.append(f"[a0][a1]acrossfade=d=0.3[atmp1]")
        else:
            audio_filter.append(f"[atmp{i-1}][a{i}]acrossfade=d=0.3[atmp{i}]")

    # Build the complete filter complex
    filter_str = ";".join(filter_complex + audio_filter)

    # Combine clips with sophisticated transitions
    concat_command = (f"ffmpeg -f concat -safe 0 -i {input_list_path} "
                      f"-filter_complex \"{filter_str}\" "
                      f"-map \"[v]\" -map \"[atmp{input_count-1}]\" "
                      f"-c:v h264 -preset fast -crf 23 -c:a aac -b:a 128k "
                      f"-t 60 {final_trailer_path}")

    try:
        subprocess.run(concat_command, shell=True, check=True)
    except subprocess.CalledProcessError:
        # Fallback to simple concatenation if complex filter fails
        print("Complex filter failed, falling back to simple concatenation...")
        simple_concat_command = (f"ffmpeg -f concat -safe 0 -i {input_list_path} "
                                f"-c:v h264 -preset fast -crf 23 -c:a aac "
                                f"-t 60 {final_trailer_path}")
        subprocess.run(simple_concat_command, shell=True, check=True)

    # Upload to S3
    s3_client = boto3.client("s3")
    s3_client.upload_file(str(final_trailer_path), "clipstream-ai", output_s3_key)

    print(f"Trailer uploaded to S3: {output_s3_key}")
    return output_s3_key

def combine_clips_simple(trailer_dir: pathlib.Path, processed_clips: list, s3_key: str):
    """
    Combines video clips with simple fade transitions.

    This function provides a fallback method for combining clips when
    complex transitions fail. It uses basic fade-in and fade-out effects
    to create a watchable trailer.

    Args:
        trailer_dir: Directory containing processed clip files
        processed_clips: List of dictionaries containing clip information
        s3_key: S3 key prefix for the output trailer file

    Returns:
        str: S3 key of the uploaded trailer file

    Raises:
        subprocess.CalledProcessError: If video processing fails
        Exception: If S3 upload fails
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



def process_clip(base_dir: pathlib.Path, original_video_path: pathlib.Path, s3_key: str, start_time: float, end_time: float, clip_index: int, transcript_segments: list):
    """
    Processes a single video clip through the complete AI pipeline.

    This function handles the end-to-end processing of a video segment:
    1. Extracts the clip segment from the original video
    2. Runs Columbia AI model for face tracking and engagement scoring
    3. Creates vertical video with AI-generated camera movements
    4. Adds professional subtitles and uploads to S3

    Args:
        base_dir: Base directory for processing operations
        original_video_path: Path to the source video file
        s3_key: S3 key prefix for the output clip file
        start_time: Start time of the clip in seconds
        end_time: End time of the clip in seconds
        clip_index: Index of the clip for naming purposes
        transcript_segments: Word-level transcript data for subtitle generation

    Returns:
        None. The processed clip is uploaded to S3.

    Raises:
        FileNotFoundError: If required tracking data is missing
        subprocess.CalledProcessError: If video processing commands fail
        Exception: If S3 upload fails
    """
    # Create unique clip name and S3 output path
    clip_name = f"clip_{clip_index}"
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
    columbia_end_time = time.time()
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


@app.cls(gpu="L40S", timeout=900, retries=0, scaledown_window=20, secrets=[modal.Secret.from_name("clipstream-ai-secret"), modal.Secret.from_name("webhook-config")], volumes={mount_path: volume})
class clipstream_ai:
    """
    Main AI processing service for automated video clip generation.

    This Modal class provides cloud-based video processing capabilities including:
    - Speech transcription using WhisperX with word-level timestamps
    - Content analysis using Google Gemini AI for moment identification
    - Face tracking and engagement scoring using Columbia AI models
    - Vertical video generation optimized for social media platforms

    Configuration:
        - GPU: NVIDIA L40S for accelerated AI processing
        - Timeout: 15 minutes for video processing operations
        - Retries: 0 (no automatic retries on failure)
        - Scaledown: 20 seconds after last request
        - Secrets: Access to API keys and credentials
        - Volumes: Persistent storage for AI models
    """

    @modal.enter()
    def load_model(self):
        """
        Initializes AI models and clients when the service starts.

        This method runs once when the Modal container starts up and loads
        all required AI models into memory for efficient processing.

        Raises:
            Exception: If model loading fails or API keys are missing
        """
        print("Loading AI models...")

        # Load WhisperX model for speech transcription
        # This model provides high-accuracy transcription with word-level timestamps
        self.whisperx_model = whisperx.load_model("large-v2", device="cuda", compute_type="float16")

        # Load alignment model for precise word-level timing
        # This ensures transcriptions have accurate start/end times for each word
        self.alignment_model, self.metadata = whisperx.load_align_model(language_code="en", device="cuda")

        print("Transcription models loaded successfully")

        # Initialize Google Gemini AI client for content analysis
        # This will be used to identify engaging moments in the transcript
        print("Initializing Gemini AI client...")
        self.gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        print("Gemini AI client initialized successfully")

    def transcribe_video(self, base_dir: pathlib.Path, video_path: pathlib.Path) -> str:
        """
        Transcribes video content using WhisperX with word-level timestamps.

        This method extracts audio from the video and performs high-accuracy
        speech transcription with precise word-level timing information.
        The audio is converted to 16kHz mono WAV format for optimal processing.

        Args:
            base_dir: Directory for temporary audio files
            video_path: Path to the video file to transcribe

        Returns:
            str: JSON string containing word-level transcript segments with timestamps

        Raises:
            subprocess.CalledProcessError: If audio extraction fails
            Exception: If transcription or alignment fails
        """
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
        print(f"Transcription and alignment completed in {duration:.2f} seconds")

        # Extract word-level segments with timestamps
        segments = []

        if "word_segments" in result:
            for word_segment in result["word_segments"]:
                segments.append({
                    "start": word_segment["start"],
                    "end": word_segment["end"],
                    "word": word_segment["word"],
                })

        return json.dumps(segments)


    def identify_moments(self, transcript: dict):
        """
        Identifies engaging moments in video transcripts using Google Gemini AI.

        This method analyzes the transcript to find question-answer pairs and
        compelling stories suitable for creating video clips. It uses AI to
        identify natural conversation boundaries and engaging content.

        Args:
            transcript: Dictionary containing word-level transcript data

        Returns:
            str: JSON string containing identified moments with start/end timestamps

        Raises:
            Exception: If Gemini API call fails
        """
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

    def identify_trailer_moments(self, transcript: dict):
        """
        Identifies trailer-optimized moments using Google Gemini AI.

        This method analyzes transcripts to find moments suitable for creating
        compelling 60-second trailers. It focuses on narrative structure with
        hooks, tension-building, climax, and cliffhanger elements.

        Args:
            transcript: Dictionary containing word-level transcript data

        Returns:
            str: JSON string containing identified trailer moments with timestamps

        Raises:
            Exception: If Gemini API call fails or JSON parsing fails
        """
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

            print("Calling Gemini for trailer moment identification...")
            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents="""
    This is a podcast video transcript with word-level timestamps. I need to create a 60-second AI trailer that builds suspense and makes viewers want to watch the full video.

    Your task: Find 4-6 VARIABLE-LENGTH moments that create a compelling narrative arc for a trailer.

    Trailer Structure Goals:
    1. OPENING HOOK (5-8 seconds): Start with a surprising statement or question that grabs attention
    2. BUILDING TENSION (8-15 seconds each): Include 2-3 moments that escalate curiosity and emotional investment
    3. CLIMAX/REVELATION (10-20 seconds): A major insight, revelation, or dramatic moment
    4. CLIFFHANGER (5-10 seconds): End with something that leaves viewers wanting more

    Content Focus:
    - Start with attention-grabbing statements or provocative questions
    - Include emotional peaks (excitement, shock, laughter, surprise)
    - Add controversial or thought-provoking statements
    - Include key insights or breakthrough moments
    - End with a cliffhanger or unresolved tension
    - Avoid greetings, thanks, or mundane conversation

    Rules:
    - Variable lengths: 5-20 seconds depending on content impact
    - Moments should NOT overlap
    - Use exact timestamps from the transcript
    - Prioritize moments that create curiosity and emotional impact
    - Consider narrative flow: hook → tension → climax → cliffhanger
    - Select moments that work together to tell a story

    Output format: [{"start": seconds, "end": seconds}, {"start": seconds, "end": seconds}, ...]
    Must be valid JSON readable by json.loads()

    If no suitable moments found, return: []

    Transcript:\n\n""" + transcript_str
            )

            response_text = response.text
            print(f"Raw Gemini response: {response_text}")

            # Check if response is empty or None
            if not response_text or response_text.strip() == "":
                print("[WARNING] Gemini returned empty response, returning empty array")
                return "[]"

            # Try to extract JSON from markdown code blocks if present
            if "```json" in response_text:
                start_idx = response_text.find("```json") + 7
                end_idx = response_text.find("```", start_idx)
                if end_idx != -1:
                    response_text = response_text[start_idx:end_idx].strip()
                    print(f"Extracted JSON from markdown: {response_text}")

            # Validate that it's valid JSON
            try:
                json.loads(response_text)
                print(f"Valid JSON confirmed: {response_text}")
                return response_text
            except json.JSONDecodeError as json_error:
                print(f"[ERROR] Invalid JSON from Gemini: {json_error}")
                print(f"Response text: {response_text}")
                return "[]"

        except Exception as e:
            print(f"[ERROR] Gemini API call failed for trailer: {e}")
            return "[]"

    @modal.fastapi_endpoint(method="POST")
    def process_video(self, request: ProcessVideoRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        """
        Main API endpoint for video processing and clip generation.

        This endpoint handles the complete video processing pipeline including:
        - Authentication and request validation
        - Video download (from S3 or YouTube)
        - Speech transcription and content analysis
        - AI-powered moment identification
        - Clip or trailer generation with professional effects

        Args:
            request: ProcessVideoRequest containing video processing parameters
            token: HTTP authorization credentials for API security

        Returns:
            dict: Processing status and results

        Raises:
            HTTPException: For authentication failures or processing errors
        """
        # Extract request parameters
        s3_key = request.s3_key
        youtube_url = request.youtube_url
        cookies_s3_key = request.cookies_s3_key
        generate_trailer = request.generate_trailer
        uploaded_file_id = request.uploaded_file_id

        print(f"[Modal] process_video endpoint called with s3_key={s3_key}, youtube_url={youtube_url}, generate_trailer={generate_trailer}, uploaded_file_id={uploaded_file_id}")

        # Validate authentication token
        if token.credentials != os.environ["AUTH_TOKEN"]:
            print(f"[Modal] Authentication failed for s3_key={s3_key}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Incorrect bearer token", headers={"WWW-Authenticate": "Bearer"})
        
        print(f"[Modal] Authentication successful for s3_key={s3_key}")

        # Wrap processing in try-catch to send error webhooks
        try:
            # Create unique processing directory
            run_id = str(uuid.uuid4())
            base_dir = pathlib.Path("/tmp") / run_id
            base_dir.mkdir(parents=True, exist_ok=True)

            video_path = base_dir / "input.mp4"
            cookies_path = None

            # Determine S3 key for clips - use original s3_key directory for consistency
            s3_key_dir = os.path.dirname(s3_key)
            clips_s3_key = s3_key_dir
            print(f"Using clips_s3_key: {clips_s3_key} (from s3_key: {s3_key})")

            # Handle video source (YouTube or S3)
            if youtube_url and cookies_s3_key:
                # Download cookies file from S3 for YouTube authentication
                s3_client = boto3.client("s3")

                # Verify cookies file exists before attempting download
                try:
                    s3_client.head_object(Bucket="clipstream-ai", Key=cookies_s3_key)
                    # Cookies file found in S3
                except Exception as e:
                    print(f"[ERROR] Cookies file not found in S3: {cookies_s3_key} - {e}")
                    raise HTTPException(status_code=400, detail="Cookies file missing. Please upload a fresh cookies.txt file.")

                # Download cookies to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp:
                    try:
                        s3_client.download_fileobj("clipstream-ai", cookies_s3_key, tmp)
                        cookies_path = tmp.name
                        # Successfully downloaded cookies
                    except Exception as e:
                        print(f"[ERROR] Failed to download cookies file: {e}")
                        raise HTTPException(status_code=400, detail="Failed to access cookies file. Please upload a fresh cookies.txt file.")

                # Download YouTube video using yt-dlp
                try:
                    ydl_opts = {
                        'outtmpl': str(video_path),
                        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
                        'merge_output_format': 'mp4',
                        'quiet': True,
                        'noplaylist': True,
                        'max_filesize': 600 * 1024 * 1024,  # 600MB limit
                    }
                    if cookies_path:
                        ydl_opts['cookiefile'] = cookies_path
                        # Using cookies file for YouTube download
                    else:
                        print("[WARNING] No cookies file provided for YouTube download")

                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(youtube_url, download=True)
                        duration = info.get('duration', 0)
                        if duration > 60 * 60:  # 1 hour limit
                            raise Exception("Video too long (max 1 hour)")
                        # Successfully downloaded YouTube video
                except Exception as e:
                    print(f"[ERROR] YouTube download failed: {e}")
                    shutil.rmtree(base_dir, ignore_errors=True)
                    raise HTTPException(status_code=400, detail=f"YouTube download failed: {e}")
                finally:
                    # Clean up temporary cookies file
                    if cookies_path:
                        try:
                            os.remove(cookies_path)
                            # Deleted temp cookies file
                        except Exception:
                            pass
                    # Clean up S3 cookies file (may fail due to permissions)
                    if cookies_s3_key:
                        try:
                            s3_client.delete_object(Bucket="clipstream-ai", Key=cookies_s3_key)
                            # Deleted cookies file from S3
                        except Exception as e:
                            print(f"[INFO] Could not delete cookies file from S3 (expected if no delete permissions): {e}")
            elif youtube_url:
                # YouTube URL provided but no cookies - validation error
                print("[ERROR] YouTube URL provided but no cookies file")
                raise HTTPException(status_code=400, detail="Cookies file is required for YouTube downloads")
            else:
                # Download video from S3
                s3_client = boto3.client("s3")
                s3_client.download_file("clipstream-ai", s3_key, str(video_path))

            # Perform speech transcription and content analysis
            transcript_segments_json = self.transcribe_video(base_dir, video_path)
            transcript_segments = json.loads(transcript_segments_json)

            # Identify engaging moments using appropriate AI prompt
            print(f"generate_trailer flag: {generate_trailer}")
            if generate_trailer:
                print("Using trailer-optimized prompt for moment identification...")
                identified_moments_raw = self.identify_trailer_moments(transcript_segments)
            else:
                print("Using clips-optimized prompt for moment identification...")
                identified_moments_raw = self.identify_moments(transcript_segments)

            print(f"Raw identified_moments_raw: {identified_moments_raw}")

            # Clean and parse JSON response from Gemini
            cleaned_json_string = identified_moments_raw.strip()
            if cleaned_json_string.startswith("```json"):
                cleaned_json_string = cleaned_json_string[len("```json"):].strip()
            if cleaned_json_string.endswith("```"):
                cleaned_json_string = cleaned_json_string[:-len("```")].strip()

            print(f"Cleaned JSON string: {cleaned_json_string}")

            # Parse and validate moment data
            try:
                clip_moments = json.loads(cleaned_json_string)
                print(f"Successfully parsed JSON: {clip_moments}")
            except Exception as e:
                print(f"[ERROR] Failed to parse Gemini output: {e}")
                print(f"JSON string that failed: '{cleaned_json_string}'")
                clip_moments = []

            if not isinstance(clip_moments, list):
                print("[ERROR] identified moments is not a list")
                clip_moments = []

            # Process moments based on generation type
            processing_success = False

            if generate_trailer:
                # Create a single trailer combining multiple moments
                print("Generating AI trailer with transitions and effects...")
                try:
                    if not clip_moments:
                        print("[WARNING] No trailer moments found, falling back to regular clip moments...")
                        # Fallback: try to get regular clip moments and use them for trailer
                        fallback_moments_raw = self.identify_moments(transcript_segments)
                        fallback_cleaned = fallback_moments_raw.strip()
                        if fallback_cleaned.startswith("```json"):
                            fallback_cleaned = fallback_cleaned[len("```json"):].strip()
                        if fallback_cleaned.endswith("```"):
                            fallback_cleaned = fallback_cleaned[:-len("```")].strip()

                        try:
                            fallback_moments = json.loads(fallback_cleaned)
                            if isinstance(fallback_moments, list) and len(fallback_moments) > 0:
                                print(f"Using fallback moments: {fallback_moments}")
                                clip_moments = fallback_moments
                            else:
                                raise Exception("No suitable moments found in video for trailer generation")
                        except Exception as fallback_error:
                            print(f"[ERROR] Fallback moment parsing failed: {fallback_error}")
                            raise Exception("No suitable moments found in video for trailer generation")

                    trailer_s3_key = create_trailer(base_dir, video_path, clips_s3_key, clip_moments, transcript_segments)
                    print(f"Trailer created successfully: {trailer_s3_key}")
                    processing_success = True
                except Exception as e:
                    print(f"[ERROR] Trailer generation failed: {e}")
                    raise Exception(f"Trailer generation failed: {e}")
            else:
                # Create individual clips
                print("Generating individual clips...")
                clips_created = 0
                # Limit to first 3 clips to avoid overwhelming the system
                for index, moment in enumerate(clip_moments[:3]):
                    if "start" in moment and "end" in moment:
                        try:
                            process_clip(base_dir, video_path, clips_s3_key, moment["start"], moment["end"], index, transcript_segments)
                            clips_created += 1
                        except Exception as e:
                            print(f"[ERROR] process_clip failed for clip {index}: {e}")

                if clips_created > 0:
                    processing_success = True
                elif not clip_moments:
                    print("[ERROR] No moments identified by AI for clip generation")
                    raise Exception("No suitable moments found in video")

            # Validate processing success
            if processing_success:
                print(f"[Modal] Processing completed successfully for {s3_key}")
            else:
                print(f"[Modal] Processing failed for {s3_key} - no clips or trailer were generated")
                raise Exception("Processing failed - no clips or trailer were generated")

            # Clean up temporary files after processing
            print(f"[Modal] Cleaning up temporary files for {s3_key}")
            if base_dir.exists():
                shutil.rmtree(base_dir, ignore_errors=True)
        
            # Send webhook notification to frontend
            print(f"[Modal] Sending webhook notification for successful completion: {uploaded_file_id}")
            send_webhook_notification(uploaded_file_id, s3_key, "success")
            
            print(f"[Modal] process_video endpoint completed for {s3_key}")
            return {"status": "success", "message": "Video processing completed"}
            
        except Exception as e:
            # Handle processing errors and send failure webhook
            error_message = str(e)
            print(f"[Modal] Processing failed for {s3_key}: {error_message}")
            
            # Clean up temporary files on error
            if 'base_dir' in locals() and base_dir.exists():
                shutil.rmtree(base_dir, ignore_errors=True)
            
            # Send error webhook notification
            send_webhook_notification(uploaded_file_id, s3_key, "error", error_message)
            
            # Re-raise as HTTP exception
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Video processing failed: {error_message}"
            )


@app.local_entrypoint()
def main():
    """
    Local entry point for testing the video processing API.

    This function provides a simple way to test the video processing
    service locally by making HTTP requests to the deployed Modal endpoint.
    It's useful for development and debugging purposes.

    Usage:
        Run this function to test video processing with a sample video file.
    """
    import requests

    # Initialize the cloud service connection
    clipstreamai = clipstream_ai()

    # Get the web address where our API is running
    url = clipstreamai.process_video.web_url

    # Prepare test data for video processing
    payload = {
        "s3_key": "test2/Blocks30mins.mp4"  # Test video file to process
    }

    # Set up request headers for API authentication
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer 123123"  # Test authentication token
    }

    # Send processing request to the cloud service
    response = requests.post(url, json=payload, headers=headers)

    # Validate response status
    response.raise_for_status()

    # Extract and display results
    result = response.json()
    print(result)
