"""
YouTube Video Download Utility

This module provides functionality for downloading YouTube videos using
pytubefix.
It includes progress tracking and stream selection for optimal video quality.

Author: ClipStream AI Team
License: Proprietary
"""

from pytubefix import YouTube
from pytubefix.cli import on_progress

# Sample YouTube URLs for testing
url1 = "https://www.youtube.com/watch?v=MbaZ93RS-uw"
url2 = "https://www.youtube.com/watch?v=GtdLwE7OvBU"


def download_youtube_video(url: str, output_path: str | None = None):
    """
    Downloads a YouTube video with progress tracking.

    This function downloads a YouTube video using pytubefix with progress
    callback functionality. It automatically selects the highest quality
    progressive stream available.

    Args:
        url: YouTube video URL to download
        output_path: Optional path for saving the video (defaults to current
                    directory)

    Returns:
        bool: True if download successful, False otherwise

    Raises:
        Exception: If video download fails or no suitable streams are found
    """
    try:
        # Initialize YouTube object with progress callback
        yt = YouTube(url, on_progress_callback=on_progress)
        print(f"Video title: {yt.title}")

        # Get available progressive streams (video + audio combined)
        streams = yt.streams.filter(progressive=True)

        if streams:
            # Select highest resolution stream
            ys = streams.get_highest_resolution()
            if ys:
                # Download the video
                if output_path:
                    ys.download(output_path)
                else:
                    ys.download()
                print(f"Successfully downloaded: {yt.title}")
                return True
            else:
                print("No suitable streams found")
                return False
        else:
            print("No streams available for this video")
            return False

    except Exception as e:
        print(f"Error downloading video: {e}")
        return False


if __name__ == "__main__":
    # Example usage: download a test video
    download_youtube_video(url1)
