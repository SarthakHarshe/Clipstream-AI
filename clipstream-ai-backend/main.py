#imports
from codecs import ignore_errors
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

    # Get all frame files and sort them chronologically
    flist = glob.glob(os.path.join(pyframes_path, "*.jpg"))
    flist.sort()

    #Step1: Looping through the tracks
    #Track: Sqeuence of detections of the same face across consecutive frames
    #Each track contains which frames the face appears in, the position (x,y), size(s), and other properties of the face in each frame
    #Score indication how likely it is, that this face is speaking in each frame.
    faces = [[] for _ in range(len(flist))]

    for tidx, track in enumerate(tracks):
        score_array = scores[tidx]
        for fidx, frame in enumerate(track["track"]["frame"].tolist()):
            slice_start = max(fidx - 30, 0)
            slice_end = min(fidx + 30, len(score_array))
            score_slice = score_array[slice_start:slice_end]
            avg_score = float(np.mean(score_slice) if len(score_slice) > 0 else 0)

            faces[frame].append({'track': tidx, 'score': avg_score, 's': track['proc_track']["s"][fidx], 'x': track['proc_track']["x"][fidx], 'y': track['proc_track']["y"][fidx]}) 

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
    scores_path = clip_dir / "pywork" / "scores.pkl"
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
        # Use Gemini AI to analyze the transcript and identify clip-worthy moments
        # The prompt instructs the AI to find question-answer pairs and stories
        response = self.gemini_client.generate_content(model="gemini-2.5-flash", contents="""
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
        for index, moment in enumerate(clip_moments[:3]):
            if "start" in moment and "end" in moment:
                print("Processing Clip" + str(index) + "from " + str(moment["start"]) + "to " + str(moment["end"]))
                process_clip(base_dir, video_path, s3_key, moment["start"], moment["end"], index, transcript_segments)
        
        # Clean up temporary files after processing
        if base_dir.exists():
            print("Cleaning up temp dir after " + str(base_dir))
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
        "s3_key": "test1/Blocks5mins.mp4"  # The video file we want to process
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