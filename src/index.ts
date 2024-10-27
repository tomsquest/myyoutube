import axios from "axios";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";

const API_KEY = process.env.YOUTUBE_API_KEY!;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID!;

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

type PlaylistItemListResponse = {
  kind: "youtube#playlistItemListResponse";
  etag: string;
  nextPageToken: string;
  prevPageToken: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: PlaylistItemsResponse[];
};

type PlaylistItemsResponse = {
  kind: "youtube#playlistItem";
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    channelTitle: string;
    videoOwnerChannelTitle: string;
    videoOwnerChannelId: string;
    playlistId: string;
    position: number;
    resourceId: {
      kind: string;
      videoId: string;
    };
  };
  contentDetails: {
    videoId: string;
    startAt: string;
    endAt: string;
    note: string;
    videoPublishedAt: string;
  };
  status: {
    privacyStatus: string;
  };
};

type ChannelVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
};

const listAllChannelVideos = (): TE.TaskEither<Error, ChannelVideo[]> => {
  const apiKey = API_KEY;
  const playlistId = "UU" + CHANNEL_ID.slice(2);
  const allVideos: ChannelVideo[] = [];

  const listByPage = (
    pageToken?: string,
  ): TE.TaskEither<Error, ChannelVideo[]> =>
    pipe(
      listChannelVideos(apiKey, playlistId, pageToken),
      TE.chain((playlistPage) => {
        const videos = playlistPage.items.map((video) => {
          return {
            id: video.snippet.resourceId.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            publishedAt: video.snippet.publishedAt,
          };
        });

        allVideos.push(...videos);

        return playlistPage.nextPageToken
          ? listByPage(playlistPage.nextPageToken)
          : TE.right(allVideos);
      }),
    );

  return listByPage();
};

const listChannelVideos = (
  apiKey: string,
  playlistId: string,
  pageToken?: string,
): TE.TaskEither<Error, PlaylistItemListResponse> => {
  const maxResults = 50; // max is 50

  // Doc: https://developers.google.com/youtube/v3/docs/search/list
  // Doc: https://developers.google.com/youtube/v3/docs/playlistItems/list
  let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${maxResults}&playlistId=${playlistId}&key=${apiKey}`;

  // no pageToken means the first page
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  return TE.tryCatch(
    async () => {
      const { data } = await axios.get<PlaylistItemListResponse>(url);
      return data;
    },
    (reason) => new Error(String(reason)),
  );
};

const main = pipe(
  listAllChannelVideos(),
  TE.fold(
    (error) => {
      console.error(`Failed to fetch videos: ${error.message}`);
      return TE.fromIO(() => {});
    },
    (videos) =>
      TE.fromIO(() => {
        videos.forEach((video, index) => {
          console.log(
            `[${String(index + 1).padStart(4)}] ${video.id} ${video.publishedAt} ${video.title}`,
          );
        });
      }),
  ),
);

main();
