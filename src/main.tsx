import { Devvit, useAsync, useState } from "@devvit/public-api";

import { ltrbxd } from "./fixture.js";

type TStore = {
  userId: string;
  rating: number;
  ratingFrozen: boolean | number;
};

interface IProps {
  getMovie: (index?: number) => any;
  getRedisStoreKey: () => string;
  getRedisStore: (k: string) => Promise<TStore>;
  setRedisStore: (k: string, v: TStore) => TStore;
  getRatingText: (rating: number) => string;
  showToast: (text: string) => void;
  page: number;
  setPage: (page: number) => void;
  movieIndex: number;
  setMovieIndex: (movie: number) => void;
  movie: any;
  setMovie: (movie: any) => void;
  store: TStore;
  setStore: (store: TStore) => void;
  movieLoading: boolean;
  storeLoading: boolean;
}

enum Route {
  Rating,
  Statistics,
}

const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
  function getMovie(index: number = 0) {
    return ltrbxd[index % ltrbxd.length] as any;
  }

  function getRedisStoreKey() {
    return `${ctx.postId}|${movie.letterboxd_slug}`;
  }

  let redisStore: string;
  let cache: { [k: string]: TStore } = {};
  async function getRedisStore(k: string): Promise<TStore> {
    if (!cache[k]) {
      redisStore = (await ctx.redis.get(k)) || "";
      const [store = { userId: ctx.userId!, rating: 5, ratingFrozen: 0 }] =
        redisStore
          .split("%")
          .filter((i) => i.startsWith(`${ctx.userId}|`))
          .map((i) => {
            const [userId, rating, ratingFrozen] = i.split("|");
            return { userId, rating: +rating, ratingFrozen: +ratingFrozen };
          });
      cache[k] = store;
    }
    return cache[k];
  }

  let timeout: number;
  function setRedisStore(k: string, v: TStore): TStore {
    cache[k] = v;
    if (!timeout)
      timeout = setTimeout(async () => {
        redisStore = (await ctx.redis.get(k)) || "";
        redisStore = redisStore.includes(`${cache[k].userId}|`)
          ? redisStore
              .split("%")
              .map((i) =>
                i.startsWith(`${cache[k].userId}|`)
                  ? `${cache[k].userId}|${cache[k].rating}|${+cache[k]
                      .ratingFrozen}`
                  : i
              )
              .join("%")
          : `${redisStore ? "%" : ""}${cache[k].userId}|${
              cache[k].rating
            }|${+cache[k].ratingFrozen}`;
        await ctx.redis.set(k, redisStore);
        timeout = 0;
      }, 1000);
    return cache[k];
  }

  function getRatingText(rating: number) {
    return rating
      ? `${[...Array(Math.floor(rating / 2))].map(() => "🌕").join("")}${[
          ...Array(Math.floor(rating % 2)),
        ]
          .map(() => "🌗")
          .join("")}`
      : "🌘";
  }

  function showToast(text: string) {
    ctx.ui.showToast(text);
  }

  const [page, setPage] = useState(Route.Rating);
  const [movieIndex, setMovieIndex] = useState(0);
  const [movie, setMovie] = useState(getMovie());
  const [store, setStore] = useState<TStore>(
    async () => await getRedisStore(getRedisStoreKey())
  );

  const { loading: movieLoading } = useAsync(async () => getMovie(movieIndex), {
    depends: [movieIndex],
    finally: (movie, error) => {
      if (!error) setMovie(movie);
    },
  });

  const { loading: storeLoading } = useAsync(
    async () => await getRedisStore(getRedisStoreKey()),
    {
      depends: [movie],
      finally: (store, error) => {
        if (!error) setStore(store!);
      },
    }
  );

  const props: IProps = {
    getMovie,
    getRedisStoreKey,
    getRedisStore,
    setRedisStore,
    getRatingText,
    showToast,
    page,
    setPage,
    movieIndex,
    setMovieIndex,
    movie,
    setMovie,
    store,
    setStore,
    movieLoading,
    storeLoading,
  };

  switch (page) {
    // case Route.Statistics:
    //   return <StatisticsPage {...props} />;
    default:
      return <RatingPage {...props} />;
  }
};

const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      <hstack alignment="middle center" gap="small" width="100%">
        {0 < props.movieIndex ? (
          <button
            disabled={props.movieLoading || props.storeLoading}
            icon="back"
            onPress={() => props.setMovieIndex(props.movieIndex - 1)}
          />
        ) : (
          ""
        )}
        <spacer grow />
        <button
          disabled={props.movieLoading || props.storeLoading}
          icon="forward"
          onPress={() => props.setMovieIndex(props.movieIndex + 1)}
        />
      </hstack>

      <spacer grow />

      <hstack alignment="bottom center" gap="small">
        <image
          height="192px"
          imageHeight={144}
          imageWidth={96}
          resizeMode="cover"
          url={`ltrbxd/${props.movie.letterboxd_slug}.jpg`}
          width="128px"
        />

        <vstack grow>
          <spacer size="small" />
          <text size="xsmall">Movie</text>
          <text maxWidth="100%" overflow="ellipsis" size="xlarge" weight="bold">
            {props.movie.name || ""}
          </text>
          <text maxWidth="100%" overflow="ellipsis" size="small">
            {props.movie.originalName || ""}
          </text>
          <spacer size="small" />
          <text size="xsmall">
            Director
            {1 < Object.values(props.movie.director || {}).length ? "s" : ""}
          </text>
          <text size="small" weight="bold" wrap>
            {Object.values(props.movie.director || {}).join(" | ")}
          </text>
          <spacer size="small" />
          <text size="xsmall">Release Date</text>
          <text size="small" weight="bold">
            {props.movie.releaseDate || ""}
          </text>
          <spacer size="small" />
        </vstack>
      </hstack>

      {props.store.ratingFrozen ? (
        <text size="small" weight="bold">
          {props.getRatingText(props.store.rating)} rating
        </text>
      ) : (
        <hstack alignment="bottom center" gap="small" width="100%">
          {0 < props.store.rating ? (
            <button
              disabled={props.movieLoading || props.storeLoading}
              icon="subtract"
              onPress={() =>
                props.setStore(
                  props.setRedisStore(props.getRedisStoreKey(), {
                    ...props.store,
                    rating: props.store.rating - 1,
                  })
                )
              }
            />
          ) : (
            ""
          )}
          <vstack alignment="top center" maxWidth="60%">
            <text
              maxWidth="100%"
              overflow="ellipsis"
              size="small"
              weight="bold"
            >
              how would you rate this movie?
            </text>
            <spacer size="small" />
            <vstack
              backgroundColor="Orangered-100"
              cornerRadius="full"
              width="60%"
            >
              <hstack
                backgroundColor="Orangered-500"
                width={`${props.store.rating * 10}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
            <spacer size="xsmall" />
            <text size="xsmall" weight="bold">
              {props.getRatingText(props.store.rating)}
            </text>
          </vstack>
          {props.store.rating < 10 ? (
            <button
              disabled={props.movieLoading || props.storeLoading}
              icon="add"
              onPress={() =>
                props.setStore(
                  props.setRedisStore(props.getRedisStoreKey(), {
                    ...props.store,
                    rating: props.store.rating + 1,
                  })
                )
              }
            />
          ) : (
            ""
          )}
        </hstack>
      )}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="statistics" />
        <spacer grow />
        {props.store.ratingFrozen ? (
          <button
            appearance="destructive"
            disabled={props.movieLoading || props.storeLoading}
            icon="undo"
            onPress={() =>
              props.setStore(
                props.setRedisStore(props.getRedisStoreKey(), {
                  ...props.store,
                  ratingFrozen: 0,
                })
              )
            }
          />
        ) : (
          <button
            appearance="primary"
            disabled={props.movieLoading || props.storeLoading}
            icon="checkmark"
            onPress={() => {
              props.setStore(
                props.setRedisStore(props.getRedisStoreKey(), {
                  ...props.store,
                  ratingFrozen: 1,
                })
              );
              props.showToast(
                `${
                  props.movie.originalName || props.movie.name
                } ~ ${props.getRatingText(props.store.rating)} rating`
              );
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};

Devvit.addCustomPostType({
  height: "tall",
  name: "ml-movies",
  render: App,
});

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "add ml-movies post",
  location: "subreddit",
  onPress: async (_event, ctx) => {
    const { reddit, ui } = ctx;
    ui.showToast("submitting & navigating");

    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: "ml-movies post",
      subredditName: subreddit.name,
      preview: (
        <vstack grow alignment="middle center">
          <text size="large">loading...</text>
        </vstack>
      ),
    });
    ui.navigateTo(post);
  },
});

Devvit.configure({
  redditAPI: true,
  redis: true,
});

export default Devvit;
