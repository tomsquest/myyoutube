import axios from "axios";

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

type Video = {
  id: {
    videoId: string;
  },
  snippet: {
    title: string;
  }
}

const getChannelVideos = async () => {
  console.log("Will list videos of channel");
  const maxResults = 20;
  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=id,snippet&order=date&maxResults=${maxResults}`;

  try {
    const response = await axios.get<{items: Video[]}>(url);
    const videos = response.data.items;

    videos.forEach((video, index:number) => {
      console.log(`[${String(index).padStart(4)}] ${video.snippet.title}, ID: ${video.id.videoId}`);
    });
  } catch (error) {
    console.error(error);
  }
};

getChannelVideos();