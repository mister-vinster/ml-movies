import { Devvit, useAsync, useState } from "@devvit/public-api";
import { chunk, round } from "lodash";

import { ltrbxd } from "./fixture.js";

enum Routes {
  Rating,
  Statistics,
}

enum Actions {
  Dummy,
  Submit,
  Reset,
}

interface IProps {
  page: number;
  setPage: (page: number) => void;
  movieIndex: number;
  setMovieIndex: (movie: number) => void;
  movie: any;
  flag: boolean;
  rating: number;
  setRating: (rating: number) => void;
  ratings: any;
  setAction: (action: number) => void;
  enIn: (v: number, locale?: string, opts?: any) => string;
  showToast: (text: string) => void;
  movieIndexLoading: boolean;
  movieLoading: boolean;
  actionLoading: boolean;
}

Devvit.configure({ redditAPI: true, redis: true });

const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
  function getMovie(index: number = 0) {
    return ltrbxd[index % ltrbxd.length] as any;
  }

  function getKeyPrefix() {
    return `${ctx.postId}|${movie.ltrbxd_slug}`;
  }

  async function getRating() {
    const rating = await ctx.redis.hGet(
      `${getKeyPrefix()}|rating`,
      ctx.userId!
    );
    if (rating === undefined) return { flag: false, rating: 5 };
    return { flag: true, rating: +rating };
  }

  async function getRatings() {
    const ratings: { [k: string]: number } = {
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
    for (const [i, v] of (
      await ctx.redis.hMGet(`${getKeyPrefix()}|ratings`, keys)
    ).entries())
      if (v) ratings[keys[i]] += +v;
    return ratings;
  }

  const [page, setPage] = useState(Routes.Rating);
  const [movieIndex, setMovieIndex] = useState(0);
  const [movie, setMovie] = useState(getMovie());
  const [flag, setFlag] = useState(async () => (await getRating()).flag);
  const [rating, setRating] = useState(async () => (await getRating()).rating);
  const [ratings, setRatings] = useState(async () => await getRatings());
  const [action, setAction] = useState(Actions.Dummy);

  function enIn(value: number, locale: string = "en-in", opts: any = {}) {
    return value.toLocaleString(locale, opts);
  }

  function showToast(text: string) {
    ctx.ui.showToast(text);
  }

  const { loading: movieIndexLoading } = useAsync(
    async () => getMovie(movieIndex),
    {
      depends: [movieIndex],
      finally: (r, e) => {
        if (!e && r) setMovie(r);
      },
    }
  );

  const { loading: movieLoading } = useAsync(
    async () => {
      const { flag, rating } = await getRating();
      return { flag, rating, ratings: await getRatings() };
    },
    {
      depends: [movie],
      finally: (r, e) => {
        if (!e && r) {
          setFlag(r.flag);
          setRating(r.rating);
          setRatings(r.ratings);
        }
      },
    }
  );

  const { loading: actionLoading } = useAsync(
    async () => {
      switch (action) {
        case Actions.Submit: {
          const txn = await ctx.redis.watch(
            `${getKeyPrefix()}|rating`,
            `${getKeyPrefix()}|ratings`
          );
          await txn.multi();
          await txn.hSet(`${getKeyPrefix()}|rating`, {
            [ctx.userId!]: `${rating}`,
          });
          await txn.hIncrBy(
            `${getKeyPrefix()}|ratings`,
            Object.keys(ratings!)[rating - 1],
            1
          );
          await txn.exec();
          return { flag: true, rating, ratings: await getRatings() };
        }

        case Actions.Reset: {
          const txn = await ctx.redis.watch(
            `${getKeyPrefix()}|rating`,
            `${getKeyPrefix()}|ratings`
          );
          await txn.multi();
          await txn.hDel(`${getKeyPrefix()}|rating`, [ctx.userId!]);
          await txn.hIncrBy(
            `${getKeyPrefix()}|ratings`,
            Object.keys(ratings!)[rating - 1],
            -1
          );
          await txn.exec();
          return { flag: false, rating, ratings: await getRatings() };
        }

        default:
          return false;
      }
    },
    {
      depends: [action],
      finally: (r, e) => {
        if (!e && r) {
          setAction(Actions.Dummy);
          setRatings(r.ratings);
          setRating(r.rating);
          setFlag(r.flag);
        }
      },
    }
  );

  const props: IProps = {
    page,
    setPage,
    movieIndex,
    setMovieIndex,
    movie,
    flag,
    rating,
    setRating,
    ratings,
    setAction,
    enIn,
    showToast,
    movieIndexLoading,
    movieLoading,
    actionLoading,
  };

  switch (page) {
    case Routes.Statistics:
      return <StatisticsPage {...props} />;
    default:
      return <RatingPage {...props} />;
  }
};

const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  function getRatingText(rating: number) {
    return `${[...Array(Math.floor(rating / 2))].map(() => "🌕").join("")}${[
      ...Array(Math.floor(rating % 2)),
    ]
      .map(() => "🌗")
      .join("")}`;
  }

  function getRatingsSummary() {
    const values: number[] = Object.values(props.ratings);
    const count = values.reduce((m, i) => m + i, 0);
    const avg =
      values.reduce((m, item, i) => m + item * (i + 1), 0) / count / 2;
    return (
      <hstack alignment="bottom center" gap="small" grow>
        <text size="xlarge" weight="bold">
          {round(avg, 1)}
        </text>
        <text maxWidth="80%" overflow="ellipsis" size="small">
          from {props.enIn(count)} ratings
        </text>
      </hstack>
    );
  }

  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      <hstack alignment="middle center" gap="small" width="100%">
        {0 < props.movieIndex ? (
          <button
            disabled={props.movieIndexLoading}
            icon="back"
            onPress={() => props.setMovieIndex(props.movieIndex - 1)}
          />
        ) : (
          ""
        )}
        <spacer grow />
        <button
          disabled={props.movieIndexLoading}
          icon="forward"
          onPress={() => props.setMovieIndex(props.movieIndex + 1)}
        />
      </hstack>

      <spacer grow />

      <hstack alignment="bottom center" gap="small" width="100%">
        <image
          height="144px"
          imageHeight={144}
          imageWidth={96}
          resizeMode="cover"
          url={`ltrbxd/${props.movie.ltrbxd_slug}.jpg`}
          width="96px"
        />

        <vstack maxWidth="60%">
          <spacer size="small" />
          <text size="xsmall">Movie</text>
          <text overflow="ellipsis" size="xlarge" weight="bold">
            {props.movie.name}
          </text>
          {props.movie.originalName ? (
            <text overflow="ellipsis" size="xsmall">
              {props.movie.originalName}
            </text>
          ) : (
            ""
          )}
          <spacer size="small" />
          <text size="xsmall">
            Director
            {1 < Object.values(props.movie.director).length ? "s" : ""}
          </text>
          <text size="small" weight="bold" wrap>
            {Object.values(props.movie.director).join(" | ")}
          </text>
          <spacer size="small" />
        </vstack>
      </hstack>

      {props.flag ? (
        <text size="small" weight="bold">
          {getRatingText(props.rating)} rating
        </text>
      ) : (
        <hstack alignment="bottom center" gap="small" width="100%">
          {1 < props.rating ? (
            <button
              disabled={props.actionLoading}
              icon="subtract"
              onPress={() => props.setRating(props.rating - 1)}
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
                width={`${(props.rating - 1) * 11.11}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
            <spacer size="xsmall" />
            <text size="xsmall" weight="bold">
              {getRatingText(props.rating)}
            </text>
          </vstack>
          {props.rating < 10 ? (
            <button
              disabled={props.actionLoading}
              icon="add"
              onPress={() => props.setRating(props.rating + 1)}
            />
          ) : (
            ""
          )}
        </hstack>
      )}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button
          disabled={props.movieLoading}
          icon="statistics"
          onPress={() => props.setPage(Routes.Statistics)}
        />
        {getRatingsSummary()}
        {props.flag ? (
          <button
            appearance="destructive"
            disabled={props.movieLoading || props.actionLoading}
            icon="undo"
            onPress={() => props.setAction(Actions.Reset)}
          />
        ) : (
          <button
            appearance="primary"
            disabled={props.movieLoading || props.actionLoading}
            icon="checkmark"
            onPress={() => {
              props.setAction(Actions.Submit);
              props.showToast(
                `${
                  props.movie.originalName || props.movie.name
                } ~ ${getRatingText(props.rating)} rating`
              );
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};

const StatisticsPage: Devvit.BlockComponent<IProps> = (props) => {
  function getRatingsSummary() {
    const values: number[] = Object.values(props.ratings);
    const count = values.reduce((m, i) => m + i, 0);
    const avg =
      values.reduce((m, item, i) => m + item * (i + 1), 0) / count / 2;
    return (
      <hstack alignment="bottom center" gap="small">
        <text size="xlarge" weight="bold">
          {round(avg, 1)}
        </text>
        <text size="small">from {props.enIn(count)} ratings</text>
      </hstack>
    );
  }

  function getRatingsChart() {
    const values: number[] = Object.values(props.ratings);
    const count = values.reduce((m, i) => m + i, 0);
    const chunks = chunk(values, 2).map((i) => i.reduce((m, i) => m + i, 0));
    return (
      <vstack alignment="middle center">
        {chunks.reverse().map((i, index) => (
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
                  {props.enIn(i)} ~ {round((i / count) * 100, 1)}%
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

      <hstack alignment="bottom center" gap="small" width="100%">
        <image
          height="72px"
          imageHeight={72}
          imageWidth={48}
          resizeMode="cover"
          url={`ltrbxd/${props.movie.ltrbxd_slug}.jpg`}
          width="48px"
        />

        <vstack maxWidth="60%">
          <spacer size="small" />
          <text size="xsmall">Movie</text>
          <text overflow="ellipsis" size="xlarge" weight="bold">
            {props.movie.name}
          </text>
          {props.movie.originalName ? (
            <text overflow="ellipsis" size="xsmall">
              {props.movie.originalName}
            </text>
          ) : (
            ""
          )}
          <spacer size="small" />
        </vstack>
      </hstack>

      {getRatingsSummary()}
      {getRatingsChart()}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="close" onPress={() => props.setPage(Routes.Rating)} />
        <spacer grow />
      </hstack>
    </vstack>
  );
};

Devvit.addCustomPostType({ height: "tall", name: "ml-movies", render: App });

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "add ml-movies post",
  location: "subreddit",
  onPress: async (_event, ctx) => {
    const { reddit, ui } = ctx;
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

export default Devvit;
