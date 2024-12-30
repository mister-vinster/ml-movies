import { Devvit, useAsync, useState } from "@devvit/public-api";
import { chunk, isEqual, round } from "lodash";

import { ltrbxd } from "./fixture.js";

type TStore = {
  userId: string;
  rating: number;
  ratingFrozen: boolean | number;
};

interface IProps {
  getMovie: (index?: number) => any;
  showToast: (text: string) => void;
  getAgg: () => any;
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

  async function getRedisStore(redisStoreKey: string) {
    return (await ctx.redis.get(redisStoreKey)) || "";
  }

  async function getStore() {
    const redisStoreKey = getRedisStoreKey();
    if (cache[redisStoreKey])
      return { redisStoreKey, store: cache[redisStoreKey] };
    const redisStore = await getRedisStore(redisStoreKey);
    const [store = { userId: ctx.userId!, rating: 5, ratingFrozen: 0 }] =
      redisStore
        .split("%")
        .filter((i) => i.startsWith(`${ctx.userId}|`))
        .map((i) => {
          const [userId, rating, ratingFrozen] = i.split("|");
          return { userId, rating: +rating, ratingFrozen: +ratingFrozen };
        });
    return { redisStore, redisStoreKey, store };
  }

  function agg(redisStore: string = "") {
    const ratings: { [k: string]: number } = {
      zero: movie.zero || 0,
      half: movie.half || 0,
      one: movie.one || 0,
      one_half: movie.one_half || 0,
      two: movie.two || 0,
      two_half: movie.two_half || 0,
      three: movie.three || 0,
      three_half: movie.three_half || 0,
      four: movie.four || 0,
      four_half: movie.four_half || 0,
      five: movie.five || 0,
    };
    const keys = Object.keys(ratings);
    for (const rating of redisStore
      .split("%")
      .map((i) => {
        const [, rating, ratingFrozen] = i.split("|");
        if (+ratingFrozen) return +rating;
        return 1000;
      })
      .filter((i) => i <= 10))
      ratings[keys[rating]] += 1;
    return ratings;
  }

  async function setRedisStore(redisStoreKey: string, store: TStore) {
    let redisStore = (await ctx.redis.get(redisStoreKey)) || "";
    redisStore = redisStore.includes(`${store.userId}|`)
      ? redisStore
          .split("%")
          .map((i) =>
            i.startsWith(`${store.userId}|`)
              ? `${store.userId}|${store.rating}|${+store.ratingFrozen}`
              : i
          )
          .join("%")
      : `${redisStore ? "%" : ""}${store.userId}|${
          store.rating
        }|${+store.ratingFrozen}`;
    await ctx.redis.set(redisStoreKey, redisStore);
    return redisStore;
  }

  function showToast(text: string) {
    ctx.ui.showToast(text);
  }

  function getAgg() {
    return cache[`${getRedisStoreKey()}|agg`];
  }

  const [cache, setCache] = useState<any>({});
  const [page, setPage] = useState(Route.Rating);
  const [movieIndex, setMovieIndex] = useState(0);
  const [movie, setMovie] = useState(getMovie());
  const [store, setStore] = useState<TStore>(async () => {
    const r = await getStore();
    setCache({
      ...cache,
      [r.redisStoreKey]: r.store,
      [`${r.redisStoreKey}|agg`]: agg(r.redisStore),
    });
    return r.store;
  });

  const { loading: movieLoading } = useAsync(async () => getMovie(movieIndex), {
    depends: [movieIndex],
    finally: (r, e) => {
      if (!e) setMovie(r);
    },
  });

  const { loading: storeLoading } = useAsync(
    async () => (await getStore()) as any,
    {
      depends: [movie],
      finally: (r, e) => {
        if (!e) {
          setCache({
            ...cache,
            [r.redisStoreKey]: r.store,
            [`${r.redisStoreKey}|agg`]: agg(r.redisStore),
          });
          setStore(r.store);
        }
      },
    }
  );

  const { loading: cacheLoading } = useAsync(
    async () => {
      const r = await getStore();
      if (!isEqual(r.store, store))
        r.redisStore = await setRedisStore(r.redisStoreKey, store); // persist
      return {
        ...cache,
        [r.redisStoreKey]: store,
        ...(r.redisStore
          ? { [`${r.redisStoreKey}|agg`]: agg(r.redisStore) }
          : {}),
      };
    },
    {
      depends: [store],
      finally: (r, e) => {
        if (!e) setCache(r);
      },
    }
  );

  const props: IProps = {
    getMovie,
    showToast,
    getAgg,
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
    case Route.Statistics:
      return <StatisticsPage {...props} />;
    default:
      return <RatingPage {...props} />;
  }
};

const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  function getRatingText(rating: number) {
    return rating
      ? `${[...Array(Math.floor(rating / 2))].map(() => "🌕").join("")}${[
          ...Array(Math.floor(rating % 2)),
        ]
          .map(() => "🌗")
          .join("")}`
      : "🌘";
  }

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
          height="144px"
          imageHeight={144}
          imageWidth={96}
          resizeMode="cover"
          url={`ltrbxd/${props.movie.letterboxd_slug}.jpg`}
          width="96px"
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
          {getRatingText(props.store.rating)} rating
        </text>
      ) : (
        <hstack alignment="bottom center" gap="small" width="100%">
          {0 < props.store.rating ? (
            <button
              disabled={props.movieLoading || props.storeLoading}
              icon="subtract"
              onPress={() =>
                props.setStore({
                  ...props.store,
                  rating: props.store.rating - 1,
                })
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
              backgroundColor="secondary-background"
              cornerRadius="full"
              width="60%"
            >
              <hstack
                backgroundColor="primary-background"
                width={`${props.store.rating * 10}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
            <spacer size="xsmall" />
            <text size="xsmall" weight="bold">
              {getRatingText(props.store.rating)}
            </text>
          </vstack>
          {props.store.rating < 10 ? (
            <button
              disabled={props.movieLoading || props.storeLoading}
              icon="add"
              onPress={() =>
                props.setStore({
                  ...props.store,
                  rating: props.store.rating + 1,
                })
              }
            />
          ) : (
            ""
          )}
        </hstack>
      )}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button
          disabled={props.movieLoading || props.storeLoading}
          icon="statistics"
          onPress={() => props.setPage(Route.Statistics)}
        />
        <spacer grow />
        {props.store.ratingFrozen ? (
          <button
            appearance="destructive"
            disabled={props.movieLoading || props.storeLoading}
            icon="undo"
            onPress={() =>
              props.setStore({
                ...props.store,
                ratingFrozen: 0,
              })
            }
          />
        ) : (
          <button
            appearance="primary"
            disabled={props.movieLoading || props.storeLoading}
            icon="checkmark"
            onPress={() => {
              props.setStore({
                ...props.store,
                ratingFrozen: 1,
              });
              // notify
              props.showToast(
                `${
                  props.movie.originalName || props.movie.name
                } ~ ${getRatingText(props.store.rating)} rating`
              );
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};

const StatisticsPage: Devvit.BlockComponent<IProps> = (props) => {
  function enIn(value: number, locale: string = "en-in", opts: any = {}) {
    return value.toLocaleString(locale, opts);
  }

  function getRatingsSummary() {
    const values: number[] = Object.values(props.getAgg());
    const count = values.reduce((m, i) => m + i, 0);
    const avg = values.reduce((m, i, index) => m + i * index, 0) / count / 2.2;
    return (
      <hstack alignment="bottom center" gap="small">
        <text size="xlarge" weight="bold">
          {round(avg, 1)}
        </text>
        <text size="small">from {enIn(count)} ratings</text>
      </hstack>
    );
  }

  function getRatingsChart() {
    const values: number[] = Object.values(props.getAgg());
    const count = values.reduce((m, i) => m + i, 0);
    const chunks = chunk(values.slice(1), 2).map((i) =>
      i.reduce((m, i) => m + i, 0)
    );
    chunks[0] += values[0]; // 11
    return (
      <vstack alignment="middle center">
        {chunks.map((i, index) => (
          <vstack width="192px">
            {index ? <spacer size="small" /> : ""}
            <hstack alignment="bottom center" gap="small">
              {0 < i ? (
                <text
                  maxWidth={`${96 + index * 16}%`}
                  overflow="ellipsis"
                  size="xsmall"
                  weight="bold"
                >
                  {enIn(i)} ~ {round((i / count) * 100, 1)}%
                </text>
              ) : (
                ""
              )}
              <spacer grow />
              <text size="xsmall">
                {[...Array(chunks.length - index)].map(() => "🌕")}
              </text>
            </hstack>
            <spacer size="xsmall" />
            <vstack backgroundColor="secondary-background" cornerRadius="full">
              <hstack
                backgroundColor="primary-background"
                width={`${(i / count) * 100}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
          </vstack>
        ))}
      </vstack>
    );
  }

  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      <spacer grow />

      <hstack alignment="bottom center" gap="small">
        <image
          height="72px"
          imageHeight={72}
          imageWidth={48}
          resizeMode="cover"
          url={`ltrbxd/${props.movie.letterboxd_slug}.jpg`}
          width="48px"
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
        </vstack>
      </hstack>

      {getRatingsSummary()}
      {getRatingsChart()}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button
          disabled={props.movieLoading || props.storeLoading}
          icon="close"
          onPress={() => props.setPage(Route.Rating)}
        />
        <spacer grow />
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
