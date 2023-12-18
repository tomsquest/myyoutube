import axios from "axios";

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

type Response = {
  items: Video[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
};

type Video = {
  id: {
    kind: string;
    videoId: string;
    channelId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
  };
};

async function* getChannelVideos(pageToken?: string): AsyncGenerator<Video[]> {
  const maxResults = 50; // max is 50

  // Doc: https://developers.google.com/youtube/v3/docs/search/list
  let url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=id,snippet&order=date&type=video&maxResults=${maxResults}`;

  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  const { data } = await axios.get<Response>(url);
  const videos = data.items;

  yield videos;

  if (data.nextPageToken) {
    yield* getChannelVideos(data.nextPageToken);
  }
}

(async () => {
  console.log(`Will list videos of the channel`);

  let index = 1;
  for await (const videos of getChannelVideos()) {
    videos.forEach((video) => {
      console.log(
        `[${String(index).padStart(4)}] ${video.id.kind} ${
          video.snippet.publishedAt
        } ${video.snippet.title}, ID: ${video.id.videoId}`,
        index++,
      );
    });
  }
})();
