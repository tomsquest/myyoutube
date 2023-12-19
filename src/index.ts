import axios from "axios";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

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

const getChannelVideos = (
  pageToken?: string,
): TE.TaskEither<Error, SearchResultResponse[]> => {
  const maxResults = 50; // max is 50

  let url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=id,snippet&order=date&type=video&maxResults=${maxResults}`;

  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  return pipe(
    TE.tryCatch(
      () => axios.get<SearchListResponse>(url),
      (reason) => new Error(String(reason)),
    ),
    TE.chain(({ data }) => {
      const videoIds = data.items.map((video) => video.id.videoId).join(",");
      return pipe(
        TE.tryCatch(
          () =>
            axios.get<VideoGetRatingResponse>(
              `https://www.googleapis.com/youtube/v3/videos/getRating?key=${API_KEY}&id=${videoIds}`,
            ),
          (reason) => new Error(String(reason)),
        ),
        TE.map((ratingResponse) => {
          data.items.forEach((video) => {
            const ratingItem = ratingResponse.data.items.find(
              (item) => item.videoId === video.id.videoId,
            );
            if (ratingItem) {
              video.rating = ratingItem.rating;
            }
          });
          return data.items;
        }),
        TE.chain((videos) =>
          data.nextPageToken
            ? pipe(
                getChannelVideos(data.nextPageToken),
                TE.map((nextPageVideos) => [...videos, ...nextPageVideos]),
              )
            : TE.right(videos),
        ),
      );
    }),
  );
};

const main = pipe(
  getChannelVideos(),
  TE.fold(
    (error) => {
      console.error(`Failed to fetch videos: ${error.message}`);
      return TE.fromIO(() => {});
    },
    (videos) =>
      TE.fromIO(() => {
        videos.forEach((video, index) => {
          console.log(
            `[${String(index + 1).padStart(4)}] ${video.id.kind} ${
              video.snippet.publishedAt
            } ${video.snippet.title}, ID: ${video.id.videoId} Rating: ${
              video.rating
            }`,
          );
        });
      }),
  ),
);

main();
