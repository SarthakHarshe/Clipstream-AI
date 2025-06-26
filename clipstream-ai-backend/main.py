#imports
import pathlib
import uuid
import modal  # Modal lets us run Python code in the cloud with GPUs
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials  # Handles API security with tokens
from fastapi import Depends, HTTPException, status  # FastAPI framework for building web APIs
from pydantic import BaseModel  # Helps validate and structure our data
import os
import boto3  # AWS SDK for talking to S3 storage

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
        pass  # We'll add actual model loading code here later

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

        # Show what files we have in our working folder (for debugging)
        print(os.listdir(base_dir))

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