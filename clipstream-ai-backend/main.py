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


# This class defines what data we expect when someone wants to process a video
# like a form that users need to fill out
class ProcessVideoRequest(BaseModel):
    s3_key: str  # The file path/name of the video in S3 (like "videos/my_video.mp4")

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


# Function to process individual video clips
# This function handles the complete pipeline for creating a single clip:
# 1. Extracts the clip segment from the original video
# 2. Runs Columbia AI model for face tracking and scoring
# 3. Creates vertical video with AI-generated camera movements
# 4. Adds subtitles and finalizes the clip
def process_clip(base_dir: pathlib.Path, original_video_path: pathlib.Path, s3_key: str, start_time: float, end_time: float, clip_index: int, transcript_segments: list):
    # Create unique clip name and S3 output path
    clip_name = f"clip_{clip_index}"
    s3_key_dir = os.path.dirname(s3_key)
    output_s3_key = f"{s3_key_dir}/{clip_name}.mp4"
    print(f"Output s3 key {output_s3_key}")

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
    
    # Debug: List all files in pywork directory
    print(f"Files in pywork directory: {list((clip_dir / 'pywork').glob('*'))}")
    print(f"Tracks path exists: {tracks_path.exists()}")
    print(f"Scores path exists: {scores_path.exists()}")
    
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
    create_subtitles_with_ffmpeg(transcript_segments, start_time, end_time, vertical_mp4_path, subtitle_output_path, max_words=5)
    
    s3_client = boto3.client("s3")
    s3_client.upload_file(subtitle_output_path, "clipstream-ai", output_s3_key)


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
        response = self.gemini_client.models.generate_content(model="gemini-2.5-flash", contents="""
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

    The transcript is as follows:\n\n""" + str(transcript))
        print(f"Identified moments response: {response.text}")
        return response.text

    @modal.fastapi_endpoint(method="POST")
    def process_video(self, request: ProcessVideoRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        # This is the main function that processes videos when someone calls our API
        # It's like a worker that takes a video and does AI magic on it
        
        # Get the video file path from the request
        s3_key = request.s3_key

        # Check if the user has permission to use our service
        # We compare their token with our secret token
        if token.credentials != os.environ["AUTH_TOKEN"]:
            # If the token is wrong, tell them they're not authorized
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
                                detail="Incorrect bearer token", headers={"WWW-Authenticate": "Bearer"})
        
        # Create a unique folder for this video processing job
        # This prevents conflicts if multiple people use the service at once
        run_id = str(uuid.uuid4())  # Generate a unique ID like "abc123-def456-ghi789"
        base_dir = pathlib.Path("/tmp") / run_id  # Create folder like "/tmp/abc123-def456-ghi789"
        base_dir.mkdir(parents=True, exist_ok=True)  # Actually create the folder

        # Download the video file from S3 to our cloud computer
        video_path = base_dir / "input.mp4"  # Save it as "input.mp4" in our folder
        s3_client = boto3.client("s3")  # Connect to AWS S3
        s3_client.download_file("clipstream-ai", s3_key, str(video_path))  # Download the video

        # Step 1: Transcribe the video to get word-level timestamps
        print("Starting video transcription...")
        transcript_segments_json = self.transcribe_video(base_dir, video_path)
        transcript_segments = json.loads(transcript_segments_json)

        # Step 2: Use Gemini AI to identify interesting moments for clips
        print("Identifying clip moments")
        identified_moments_raw = self.identify_moments(transcript_segments)

        # Clean up the JSON response from Gemini (remove markdown formatting if present)
        cleaned_json_string = identified_moments_raw.strip()
        if cleaned_json_string.startswith("```json"):
            cleaned_json_string = cleaned_json_string[len("```json"):].strip()
        if cleaned_json_string.endswith("```"):
            cleaned_json_string = cleaned_json_string[:-len("```")].strip()

        # Parse the identified moments into a list of clip timestamps
        clip_moments = json.loads(cleaned_json_string)
        if not isinstance(clip_moments, list):
            print("Error: identified moments is not a list")
            clip_moments = []
        
        print(clip_moments)

        # Step 3: Process each identified moment into a vertical video clip
        # Limit to first 3 clips to avoid overwhelming the system
        for index, moment in enumerate(clip_moments[:1]):
            if "start" in moment and "end" in moment:
                print("Processing Clip" + str(index) + "from " + str(moment["start"]) + "to " + str(moment["end"]))
                process_clip(base_dir, video_path, s3_key, moment["start"], moment["end"], index, transcript_segments)
        
        # Clean up temporary files after processing
        if base_dir.exists():
            print(f"Cleaning up temp dir after {base_dir}")
            shutil.rmtree(base_dir, ignore_errors=True)


# This function lets us test our API from our local computer
@app.local_entrypoint()
def main():
    # Import the requests library for making HTTP calls
    import requests

    # Connect to our cloud service
    clipstreamai = clipstream_ai()

    # Get the web address where our API is running
    url = clipstreamai.process_video.get_web_url()  

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