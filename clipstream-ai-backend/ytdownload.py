from pytubefix import YouTube
from pytubefix.cli import on_progress

url1 = "https://www.youtube.com/watch?v=MbaZ93RS-uw"
url2 = "https://www.youtube.com/watch?v=GtdLwE7OvBU"

yt = YouTube(url1, on_progress_callback=on_progress)
print(yt.title)

# Get available streams and check if any exist
streams = yt.streams.filter(progressive=True)
if streams:
    ys = streams.get_highest_resolution()
    if ys:
        ys.download()
    else:
        print("No suitable streams found")
else:
    print("No streams available for this video")