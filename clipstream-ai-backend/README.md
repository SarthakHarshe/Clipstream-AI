# ClipStream AI Backend

A cloud-based video processing service that automatically generates engaging video clips and trailers using AI-powered content analysis and computer vision.

## Overview

ClipStream AI Backend is a Modal-based cloud service that processes video content to create optimized clips for social media platforms. The service combines multiple AI technologies including:

- **WhisperX**: High-accuracy speech transcription with word-level timestamps
- **Google Gemini AI**: Content analysis for identifying engaging moments
- **Columbia AI Models**: Face tracking and engagement scoring
- **Computer Vision**: Intelligent camera movements and vertical video generation

## Features

### Core Functionality

- **Video Transcription**: Automatic speech-to-text with precise timing
- **Moment Identification**: AI-powered detection of engaging content segments
- **Vertical Video Generation**: Automatic conversion to 9:16 aspect ratio for social media
- **Face Tracking**: Intelligent camera movements that follow the most engaging speaker
- **Subtitle Generation**: Professional subtitles with optimal styling for mobile viewing
- **Trailer Creation**: 60-second narrative-focused trailers with smooth transitions

### Supported Input Sources

- **Direct Upload**: Process videos uploaded to S3
- **YouTube Integration**: Download and process YouTube videos (requires cookies.txt)

### Output Formats

- **Individual Clips**: 30-60 second clips optimized for social media
- **AI Trailers**: 60-second trailers with narrative flow and suspense building

## Architecture

### Technology Stack

- **Modal**: Cloud infrastructure and GPU acceleration
- **FastAPI**: REST API framework
- **WhisperX**: Speech transcription
- **Google Gemini**: Content analysis
- **OpenCV**: Computer vision and video processing
- **FFmpeg**: Video manipulation and encoding
- **Columbia AI**: Face tracking and engagement scoring

### Infrastructure

- **GPU**: NVIDIA L40S for accelerated AI processing
- **Storage**: S3 for video storage and model caching
- **Authentication**: Bearer token-based API security
- **Timeout**: 15-minute processing window for video operations

## Installation

### Prerequisites

- Python 3.12+
- Modal CLI configured
- AWS S3 access
- Google Gemini API key

### Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment variables:

```bash
export GEMINI_API_KEY="your_gemini_api_key"
export AUTH_TOKEN="your_auth_token"
```

3. Deploy to Modal:

```bash
modal deploy main.py
```

## API Reference

### Process Video Endpoint

**POST** `/process_video`

Processes a video to generate clips or trailers.

#### Request Body

```json
{
  "s3_key": "videos/uuid/filename.mp4",
  "youtube_url": "https://youtube.com/watch?v=...",
  "cookies_s3_key": "cookies/uuid/cookies.txt",
  "generate_trailer": false
}
```

#### Parameters

- `s3_key` (string, required): S3 key for video file
- `youtube_url` (string, optional): YouTube URL for processing
- `cookies_s3_key` (string, optional): S3 key for cookies.txt file
- `generate_trailer` (boolean, optional): Generate trailer instead of clips

#### Response

```json
{
  "status": "success",
  "message": "Processing completed successfully"
}
```

#### Authentication

Include Bearer token in Authorization header:

```
Authorization: Bearer your_auth_token
```

## Usage Examples

### Local Testing

```python
from main import clipstream_ai

# Initialize service
service = clipstream_ai()

# Process video
result = service.process_video(
    request=ProcessVideoRequest(
        s3_key="videos/test.mp4",
        generate_trailer=False
    ),
    token=HTTPAuthorizationCredentials(scheme="Bearer", credentials="your_token")
)
```

### YouTube Video Processing

```python
# Process YouTube video with cookies
result = service.process_video(
    request=ProcessVideoRequest(
        s3_key="videos/uuid/placeholder.mp4",
        youtube_url="https://youtube.com/watch?v=...",
        cookies_s3_key="cookies/uuid/cookies.txt",
        generate_trailer=True
    ),
    token=HTTPAuthorizationCredentials(scheme="Bearer", credentials="your_token")
)
```

## File Structure

```
clipstream-ai-backend/
├── main.py                 # Main application and API endpoints
├── ytdownload.py          # YouTube download utility
├── requirements.txt       # Python dependencies
├── asd/                  # Columbia AI models (external library)
│   ├── Columbia_test.py
│   ├── model/
│   └── weight/
└── README.md             # This file
```

## Processing Pipeline

1. **Video Input**: Download from S3 or YouTube
2. **Audio Extraction**: Convert to 16kHz mono WAV
3. **Transcription**: WhisperX with word-level timestamps
4. **Content Analysis**: Gemini AI for moment identification
5. **Video Processing**: Columbia AI for face tracking
6. **Vertical Generation**: AI-powered camera movements
7. **Subtitle Addition**: Professional styling and timing
8. **Output**: Upload to S3

## Error Handling

The service includes comprehensive error handling for:

- Authentication failures
- Video download issues
- Transcription errors
- AI model failures
- S3 upload problems
- Invalid input parameters

## Performance

- **Processing Time**: 5-15 minutes depending on video length
- **Video Limits**: Maximum 1 hour duration, 600MB file size
- **Output Quality**: 1080x1920 vertical format, H.264 encoding
- **Concurrent Processing**: Modal handles scaling automatically

## Security

- **Authentication**: Bearer token validation
- **Input Validation**: Comprehensive request validation
- **Temporary Files**: Automatic cleanup after processing
- **S3 Security**: IAM-based access control

## Monitoring

The service includes detailed logging for:

- Processing progress
- Error conditions
- Performance metrics
- API usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit a pull request

## License

Proprietary - All rights reserved by ClipStream AI

## Support

For technical support or questions, please contact the ClipStream AI team.
