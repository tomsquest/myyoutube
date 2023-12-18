import axios from "axios";

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

type SearchListResponse = {
  items: SearchResultResponse[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
};

type SearchResultResponse = {
  id: {
    kind: string;
    videoId: string;
    channelId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
  };
  rating: "like" | "dislike" | "none" | "unspecified";
};

type VideoGetRatingResponse = {
  items: {
    videoId: string;
    rating: "like" | "dislike" | "none" | "unspecified";
  }[];
};

async function* getChannelVideos(
  pageToken?: string,
): AsyncGenerator<SearchResultResponse[]> {
  const maxResults = 50; // max is 50

  // Doc: https://developers.google.com/youtube/v3/docs/search/list
  let url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=id,snippet&order=date&type=video&maxResults=${maxResults}`;

  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  const { data } = await axios.get<SearchListResponse>(url);
  const videos = data.items;

  // Get rating for each video in bulk
  const videoIds = videos.map((video) => video.id.videoId).join(",");
  const ratingResponse = await axios.get<VideoGetRatingResponse>(
    `https://www.googleapis.com/youtube/v3/videos/getRating?key=${API_KEY}&id=${videoIds}`,
  );
  for (const item of ratingResponse.data.items) {
    const video = videos.find((video) => video.id.videoId === item.videoId);
    if (video) {
      video.rating = item.rating;
    }
  }

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
        } ${video.snippet.title}, ID: ${video.id.videoId} Rating: ${
          video.rating
        }`,
      );
      index++;
    });
  }
})();
