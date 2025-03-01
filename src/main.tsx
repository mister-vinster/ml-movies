import { Devvit, useAsync, useState } from "@devvit/public-api";

import { Actions, Routes } from "./config.ts";
import { ltrbxd } from "./fixture.ts";
import { IProps } from "./interface.ts";
import { RatingPage } from "./rating.tsx";
import { StatsPage } from "./stats.tsx";

Devvit.configure({ redditAPI: true, redis: true });

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "add ml-movies post",
  location: "subreddit",
  onPress: async (_event, ctx) => {
    const { reddit, ui } = ctx;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: "movie ratings",
      subredditName: subreddit.name,
      preview: (
        <vstack alignment="middle center" grow>
          <text size="large">loading...</text>
        </vstack>
      ),
    });
    ui.navigateTo(post);
  },
});

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

  const { loading: movieIndexLoading } = useAsync(() => getMovie(movieIndex), {
    depends: [movieIndex],
    finally: (r) => {
      if (r) setMovie(r);
    },
  });

  const { loading: movieLoading } = useAsync(
    async () => {
      const { flag, rating } = await getRating();
      return { flag, rating, ratings: await getRatings() };
    },
    {
      depends: [movie],
      finally: (r) => {
        if (r) {
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
        if (r) {
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
    case Routes.Stats:
      return <StatsPage {...props} />;
    default:
      return <RatingPage {...props} />;
  }
};

Devvit.addCustomPostType({ height: "tall", name: "ml-movies", render: App });

export default Devvit;
