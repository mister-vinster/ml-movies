import { Devvit, useAsync, useForm, useState } from "@devvit/public-api";
import { csvFormat } from "d3-dsv";
import { random } from "lodash";
import { isJSON } from "validator";

import { validate } from "./ajv.ts";
import { Actions, Routes } from "./config.ts";
import { IProps } from "./interface.ts";
import { RatingPage } from "./rating.tsx";
import { StatsPage } from "./stats.tsx";

Devvit.configure({ redditAPI: true, redis: true });

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "add ml-movies post",
  location: "subreddit",
  onPress: async (_event, ctx) => {
    const post = await ctx.reddit.submitPost({
      title: "movie ratings",
      subredditName: ctx.subredditName!,
      preview: (
        <vstack alignment="middle center" grow>
          <text size="large">loading...</text>
        </vstack>
      ),
    });
    await ctx.redis.set(
      `${post.id}|configs`,
      JSON.stringify({
        mods: [ctx.userId],
        movies: [{ id: "id", title: "title" }],
      })
    );
    ctx.ui.navigateTo(post);
  },
});

const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
  async function getConfigs() {
    const configs = await ctx.redis.get(`${ctx.postId}|configs`);
    return configs && isJSON(configs) ? JSON.parse(configs) : {};
  }

  function getMovie(index: number = 0) {
    return configs.movies?.length
      ? configs.movies[index % configs.movies.length]
      : { id: "id", title: "title" };
  }

  function getKeyPrefix() {
    return `${ctx.postId}|movie-${movie.id}`;
  }

  async function getRating() {
    const rating = await ctx.redis.hGet(
      `${getKeyPrefix()}|rating`,
      ctx.userId!
    );
    if (rating === undefined) return { flag: false, rating: random(1, 10) };
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

  const [configs, setConfigs] = useState(async () => await getConfigs());
  const [page, setPage] = useState(Routes.Rating);
  const [movieIndex, setMovieIndex] = useState(0);
  const [movie, setMovie] = useState(getMovie());
  const [flag, setFlag] = useState(async () => (await getRating()).flag);
  const [rating, setRating] = useState(async () => (await getRating()).rating);
  const [ratings, setRatings] = useState(async () => await getRatings());
  const [action, setAction] = useState(Actions.Dummy);

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
      finally: (r: any, e) => {
        setAction(Actions.Dummy);

        if (r)
          switch (action) {
            case Actions.Submit:
            case Actions.Reset: {
              setRatings(r.ratings);
              setRating(r.rating);
              setFlag(r.flag);
            }
          }
      },
    }
  );

  function showToast(text: string) {
    ctx.ui.showToast(text);
  }

  function enIn(value: number, locale: string = "en-in", opts: any = {}) {
    return value.toLocaleString(locale, opts);
  }

  const customizeForm = useForm(
    {
      acceptLabel: "save",
      description: "more ~ github.com/hedcet/ml-movies",
      fields: [
        {
          defaultValue: JSON.stringify(configs, null, 2),
          label: "configs",
          lineHeight: 15,
          name: "configs",
          required: true,
          type: "paragraph",
        },
      ],
    },
    async (r) => {
      if (r.configs && isJSON(r.configs)) {
        const configs = JSON.parse(r.configs);
        if (validate(configs)) {
          await ctx.redis.set(`${ctx.postId}|configs`, r.configs);
          setConfigs(configs);
          // populate configs.refs
        } else {
          const [error] = validate.errors!;
          showToast(error.message || "invalid configs");
        }
      } else showToast("invalid json");
    }
  );

  function customize() {
    ctx.ui.showForm(customizeForm);
  }

  async function download() {
    const data = configs.movies
      ? await Promise.all(
          configs.movies.map(async (movie: any) => {
            const [
              half,
              one,
              one_half,
              two,
              two_half,
              three,
              three_half,
              four,
              four_half,
              five,
            ] = await ctx.redis.hMGet(
              `${ctx.postId}|movie-${movie.id}|ratings`,
              [
                "half",
                "one",
                "one_half",
                "two",
                "two_half",
                "three",
                "three_half",
                "four",
                "four_half",
                "five",
              ]
            );
            return {
              ...movie,
              half: +(movie.half || 0) + +(half || 0),
              one: +(movie.one || 0) + +(one || 0),
              one_half: +(movie.one_half || 0) + +(one_half || 0),
              two: +(movie.two || 0) + +(two || 0),
              two_half: +(movie.two_half || 0) + +(two_half || 0),
              three: +(movie.three || 0) + +(three || 0),
              three_half: +(movie.three_half || 0) + +(three_half || 0),
              four: +(movie.four || 0) + +(four || 0),
              four_half: +(movie.four_half || 0) + +(four_half || 0),
              five: +(movie.five || 0) + +(five || 0),
            };
          })
        )
      : [];
    ctx.ui.navigateTo(
      `https://ml-movies.hedcet.workers.dev?sub=${
        ctx.subredditName
      }&href=${encodeURIComponent(
        `data:text/csv;base64,${Buffer.from(csvFormat(data)).toString(
          "base64"
        )}`
      )}`
    );
  }

  const props: IProps = {
    page,
    setPage,
    movieIndex,
    setMovieIndex,
    movieIndexLoading,
    movie,
    movieLoading,
    flag,
    rating,
    setRating,
    ratings,
    setAction,
    actionLoading,
    showToast,
    enIn,
    mod: configs.mods?.includes(ctx.userId) || ctx.userId === "t2_tnr2e",
    customize,
    download,
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
