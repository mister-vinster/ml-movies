import { Devvit, useAsync, useForm, useState } from "@devvit/public-api";
import { csvFormat } from "d3-dsv";
import { isJSON, isURL } from "validator";
import { Buffer } from 'buffer';

import { validate } from "./ajv.ts";
import { Actions, Routes } from "./config.ts";
import { IConfigs, IMovie, IProps } from "./interface.ts"; // Keep IProps here for now
import { RatingPage } from "./rating.tsx";
import { StatsPage } from "./stats.tsx";

Devvit.configure({ media: true, redditAPI: true, redis: true });

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
        movies: [{
          id: "id",
          title: "title",
          // ADDED: Initialize recommendation counts
          recommend_yes: 0,
          recommend_conditional: 0,
          recommend_no: 0,
        }],
      })
    );
    ctx.ui.navigateTo(post);
  },
});

// Temporarily redefine IProps here to include _recommendation for local use in App
// This will be aligned with src/interface.ts in the next step.
interface ILocalProps extends IProps {
  movie: IMovie & { _rating?: number, _ratings?: { [k: string]: number }, _recommendation?: string };
}


const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
  async function getConfigs() {
    const configs = await ctx.redis.get(`${ctx.postId}|configs`);
    return configs && isJSON(configs) ? JSON.parse(configs) : {};
  }

  function getPrefix(suffix: string) {
    return `${ctx.postId}|movie-${suffix}`;
  }

  async function getRating(prefix: string) {
    const v = await ctx.redis.hGet(`${prefix}|rating`, ctx.userId!);
    return v === undefined ? undefined : +v;
  }

  // ADDED: Function to get a user's individual recommendation
  async function getRecommendation(prefix: string) {
    const v = await ctx.redis.hGet(`${prefix}|recommendation`, ctx.userId!);
    return v === undefined ? undefined : v; // Recommendation is a string
  }

  // MODIFIED: getRatings now also handles recommendation counts
  async function getRatingsAndRecommendations(prefix: string, preload: IMovie) {
    // Star Ratings
    const ratingsKey = `${prefix}|ratings`;
    const starCounts: { [k: string]: number } = {
      one: preload.one || 0,
      two: preload.two || 0,
      three: preload.three || 0,
      four: preload.four || 0,
      five: preload.five || 0,
      six: preload.six || 0,
      seven: preload.seven || 0,
      eight: preload.eight || 0,
      nine: preload.nine || 0,
      ten: preload.ten || 0,
    };
    const starKeys = Object.keys(starCounts);
    for (const [i, v] of (await ctx.redis.hMGet(ratingsKey, starKeys)).entries())
      if (v) starCounts[starKeys[i]] += +v;

    // Recommendation Counts
    const recommendationsKey = `${prefix}|recommendations`;
    const recommendCounts: { [k: string]: number } = {
      recommend_yes: preload.recommend_yes || 0,
      recommend_conditional: preload.recommend_conditional || 0,
      recommend_no: preload.recommend_no || 0,
    };
    const recommendKeys = Object.keys(recommendCounts);
    for (const [i, v] of (await ctx.redis.hMGet(recommendationsKey, recommendKeys)).entries())
      if (v) recommendCounts[recommendKeys[i]] += +v;

    return { starCounts, recommendCounts };
  }

  async function getMovies() {
    return (await Promise.all(
      (configs?.movies || []).map(async (m1: IMovie) => {
        const m10: any = structuredClone(m1);
        if (m10.image_uri && configs.refs?.[m10.image_uri])
          m10.image_uri = configs.refs[m10.image_uri];

        m10._rating = await getRating(getPrefix(m10.id));
        m10._recommendation = await getRecommendation(getPrefix(m10.id)); // ADDED: Fetch user's individual recommendation

        // MODIFIED: Fetch both star ratings and recommendation counts
        const { starCounts, recommendCounts } = await getRatingsAndRecommendations(getPrefix(m10.id), m10);
        m10._ratings = starCounts;
        m10._recommendations = recommendCounts; // ADDED: Store aggregated recommendation counts

        return m10;
      })
    )) as any;
  }

  const [configs, setConfigs] = useState(async () => await getConfigs());
  const [page, setPage] = useState(Routes.Rating);
  const [movies, setMovies] = useState(async () => await getMovies());
  // MODIFIED: Initialize movie with new recommendation properties
  const [movie, setMovie] = useState(movies[0] || {
    id: "id",
    title: "title",
    _recommendation: undefined, // Initialize user's recommendation state
    _recommendations: { recommend_yes: 0, recommend_conditional: 0, recommend_no: 0 } // Initialize aggregated recommendations
  });
  const [movieIndex, setMovieIndex] = useState(0);
  const [action, setAction] = useState(Actions.Dummy);

  const { loading: actionLoading } = useAsync(
    async () => {
      switch (action) {
        case Actions.Submit: {
          const prefix = getPrefix(movie.id);
          const currentRating = await getRating(prefix);
          const currentRecommendation = await getRecommendation(prefix); // ADDED: Get current recommendation

          const k1_rating = `${prefix}|rating`;
          const k10_ratings = `${prefix}|ratings`;
          const k1_recommendation = `${prefix}|recommendation`; // ADDED: Key for individual recommendation
          const k10_recommendations = `${prefix}|recommendations`; // ADDED: Key for aggregated recommendations

          // MODIFIED: Watch all keys involved in the transaction
          const txn = await ctx.redis.watch(k1_rating, k10_ratings, k1_recommendation, k10_recommendations);
          await txn.multi();

          // Handle Star Rating Submission
          if (currentRating === undefined) { // Only submit if not previously rated
            await txn.hSet(k1_rating, { [ctx.userId!]: `${movie._rating}` });
            await txn.hIncrBy(
              k10_ratings,
              Object.keys(movie._ratings)[movie._rating - 1],
              1
            );
          }

          // Handle Recommendation Submission (only if user provided one)
          if (movie._recommendation !== undefined && currentRecommendation === undefined) {
             await txn.hSet(k1_recommendation, { [ctx.userId!]: movie._recommendation });
             await txn.hIncrBy(
               k10_recommendations,
               movie._recommendation, // Use the recommendation string as the key
               1
             );
          }


          await txn.exec();

          // MODIFIED: Return both star ratings and recommendation counts
          const { starCounts, recommendCounts } = await getRatingsAndRecommendations(prefix, movie);
          return { ratings: starCounts, recommendations: recommendCounts };
        }

        case Actions.Reset: {
          const prefix = getPrefix(movie.id);
          const currentRating = await getRating(prefix);
          const currentRecommendation = await getRecommendation(prefix); // ADDED: Get current recommendation

          const k1_rating = `${prefix}|rating`;
          const k10_ratings = `${prefix}|ratings`;
          const k1_recommendation = `${prefix}|recommendation`; // ADDED: Key for individual recommendation
          const k10_recommendations = `${prefix}|recommendations`; // ADDED: Key for aggregated recommendations

          // MODIFIED: Watch all keys involved in the transaction
          const txn = await ctx.redis.watch(k1_rating, k10_ratings, k1_recommendation, k10_recommendations);
          await txn.multi();

          // Handle Star Rating Reset
          if (currentRating !== undefined) {
            await txn.hDel(k1_rating, [ctx.userId!]);
            await txn.hIncrBy(k10_ratings, Object.keys(movie._ratings)[currentRating - 1], -1);
          }

          // Handle Recommendation Reset
          if (currentRecommendation !== undefined) {
            await txn.hDel(k1_recommendation, [ctx.userId!]);
            await txn.hIncrBy(k10_recommendations, currentRecommendation, -1);
          }

          await txn.exec();

          // MODIFIED: Return both star ratings and recommendation counts
          const { starCounts, recommendCounts } = await getRatingsAndRecommendations(prefix, movie);
          return { ratings: starCounts, recommendations: recommendCounts };
        }

        default:
          const { _ratings: ratings, _recommendations: recommendations } = movie; // MODIFIED: Destructure recommendations
          return { ratings, recommendations }; // MODIFIED: Return recommendations
      }
    },
    {
      depends: [action],
      finally: (r: any, e) => {
        setAction(Actions.Dummy);

        if (r) {
          // MODIFIED: Update movie state with both ratings and recommendations
          setMovie({ ...movie, _ratings: r.ratings, _recommendations: r.recommendations });
          setMovies(
            movies.map((m: any) => {
              if (movie.id === m.id) {
                m._rating = movie._rating;
                m._ratings = r.ratings;
                m._recommendation = movie._recommendation; // Update saved recommendation
                m._recommendations = r.recommendations; // Update aggregated recommendations
              }
              return m;
            })
          );
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
      description: "refer ~ github.com/hedcet/ml-movies",
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
        const configs: IConfigs = JSON.parse(r.configs);
        if (validate(configs)) {
          await Promise.all(
            configs.movies.map(async (movie) => {
              if (movie.image_uri) {
                if (isURL(movie.image_uri)) {
                  if (new URL(movie.image_uri).hostname.endsWith(".redd.it"))
                    return;
                  if (isURL(configs.refs?.[movie.image_uri] || "")) return;
                  try {
                    const { mediaUrl } = await ctx.media.upload({
                      type: "image",
                      url: movie.image_uri,
                    });
                    configs.refs = {
                      ...configs.refs,
                      [movie.image_uri]: mediaUrl,
                    };
                  } catch (e) {
                    showToast(`failed to upload image_uri|${movie.image_uri}`);
                    delete movie.image_uri;
                  }
                } else {
                  showToast(`invalid image_uri|${movie.image_uri}`);
                  delete movie.image_uri;
                }
              }
            })
          );
          await ctx.redis.set(`${ctx.postId}|configs`, JSON.stringify(configs));
          setConfigs(configs);
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
          configs.movies.map(async (movie: IMovie & {
            one?: number; two?: number; three?: number; four?: number; five?: number;
            six?: number; seven?: number; eight?: number; nine?: number; ten?: number;
            recommend_yes?: number; recommend_conditional?: number; recommend_no?: number;
          }) => { // Temporary type assertion for movie in map to include all expected fields
            if (movie.image_uri && configs.refs?.[movie.image_uri])
              movie.image_uri = configs.refs[movie.image_uri];

            const [
              one, two, three, four, five, six, seven, eight, nine, ten,
              recommend_yes, recommend_conditional, recommend_no, // ADDED: New recommendation fields
            ] = await ctx.redis.hMGet(
              `${ctx.postId}|movie-${movie.id}|ratings`, // Still retrieving star ratings from 'ratings' hash
              [
                "one", "two", "three", "four", "five",
                "six", "seven", "eight", "nine", "ten",
              ]
            );

            // ADDED: Retrieve recommendation counts from a separate 'recommendations' hash
            const [
              rec_yes, rec_conditional, rec_no,
            ] = await ctx.redis.hMGet(
              `${ctx.postId}|movie-${movie.id}|recommendations`, // New hash for recommendations
              [
                "recommend_yes", "recommend_conditional", "recommend_no",
              ]
            );

            return {
              ...movie,
              one: +(one || 0) + (movie.one || 0),
              two: +(two || 0) + (movie.two || 0),
              three: +(three || 0) + (movie.three || 0),
              four: +(four || 0) + (movie.four || 0),
              five: +(five || 0) + (movie.five || 0),
              six: +(six || 0) + (movie.six || 0),
              seven: +(seven || 0) + (movie.seven || 0),
              eight: +(eight || 0) + (movie.eight || 0),
              nine: +(nine || 0) + (movie.nine || 0),
              ten: +(ten || 0) + (movie.ten || 0),
              // ADDED: Add recommendation counts to the returned object
              recommend_yes: +(rec_yes || 0) + (movie.recommend_yes || 0),
              recommend_conditional: +(rec_conditional || 0) + (movie.recommend_conditional || 0),
              recommend_no: +(rec_no || 0) + (movie.recommend_no || 0),
            };
          })
        )
      : [];
    ctx.ui.navigateTo(
      `https://ml-movies.hedcet.workers.dev?href=${encodeURIComponent(
        `data:text/csv;base64,${Buffer.from(csvFormat(data)).toString(
          "base64"
        )}`
      )}`
    );
  }

  const props: ILocalProps = { // Changed to ILocalProps for local consistency
    page,
    setPage,
    movies,
    movie,
    setMovie,
    movieIndex,
    setMovieIndex,
    mod: configs.mods?.includes(ctx.userId) || ctx.userId === "t2_tnr2e", // u/HedCET
    pagination: movies.length,
    setAction,
    // actionLoading,
    showToast,
    enIn,
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