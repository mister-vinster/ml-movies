import { Devvit, useAsync, useForm, useState } from "@devvit/public-api";
import { csvFormat } from "d3-dsv";
import { isJSON, isURL } from "validator";
import { Buffer } from 'buffer';

import { validate } from "./ajv.ts";
import { Actions, Routes, RankingFilterType, getCurrentYear, getCurrentMonth } from "./config.ts"; // MODIFIED: Import new enums/helpers
import { IConfigs, IMovie, IRuntimeMovie, IProps, RankingFilterState } from "./interface.ts"; // MODIFIED: Import RankingFilterState
import { RatingPage } from "./rating.tsx";
import { StatsPage } from "./stats.tsx";
import { RankingPage } from "./RankingPage.tsx"; // NEW: Import RankingPage

Devvit.configure({ media: true, redditAPI: true, redis: true });

// --- Helper Functions (Outside App Component) ---

// Helper to calculate average rating and total votes for a movie
function calculateMovieAverageRating(movie: IRuntimeMovie): { averageRating: number, totalStarVotes: number } {
  if (!movie._ratings) {
    return { averageRating: 0, totalStarVotes: 0 };
  }

  const starCounts = movie._ratings;
  let totalScore = 0;
  let totalVotes = 0;

  Object.keys(starCounts).forEach((key, index) => {
    const starValue = index + 1; // "one" is index 0 (star 1), etc.
    const count = starCounts[key] || 0;
    totalScore += count * starValue;
    totalVotes += count;
  });

  const averageRating = totalVotes ? totalScore / totalVotes : 0;
  return { averageRating, totalStarVotes: totalVotes };
}

// Helper to extract unique years and months from movie release dates
function extractAvailableYearsAndMonths(movies: IMovie[]) {
  const years = new Set<number>();
  const months = new Set<{ year: number, month: number, monthName: string }>();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  movies.forEach(movie => {
    if (movie.release_date) {
      try {
        const date = new Date(movie.release_date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 1-indexed month

        if (!isNaN(year) && !isNaN(month)) { // Ensure valid date
          years.add(year);
          months.add({ year, month, monthName: monthNames[month - 1] });
        }
      } catch (e) {
        // console.error("Invalid release_date format:", movie.release_date);
      }
    }
  });

  const sortedYears = Array.from(years).sort((a, b) => a - b);
  // Sort months, primarily by year, then by month number
  const sortedMonths = Array.from(months).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return { availableYears: sortedYears, availableMonths: sortedMonths };
}


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
          recommend_yes: 0,
          recommend_conditional: 0,
          recommend_no: 0,
          release_date: "" // Initialize release_date for new entries
        }],
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

  function getPrefix(suffix: string) {
    return `${ctx.postId}|movie-${suffix}`;
  }

  async function getRating(prefix: string) {
    const v = await ctx.redis.hGet(`${prefix}|rating`, ctx.userId!);
    return v === undefined ? undefined : +v;
  }

  async function getRecommendation(prefix: string) {
    const v = await ctx.redis.hGet(`${prefix}|recommendation`, ctx.userId!);
    return v === undefined ? undefined : v;
  }

  async function getRatingsAndRecommendations(prefix: string, preload: IMovie) {
    const ratingsKey = `${prefix}|ratings`;
    const starCounts: { [k: string]: number } = {
      one: preload.one || 0, two: preload.two || 0, three: preload.three || 0,
      four: preload.four || 0, five: preload.five || 0, six: preload.six || 0,
      seven: preload.seven || 0, eight: preload.eight || 0, nine: preload.nine || 0, ten: preload.ten || 0,
    };
    const starKeys = Object.keys(starCounts);
    for (const [i, v] of (await ctx.redis.hMGet(ratingsKey, starKeys)).entries())
      if (v) starCounts[starKeys[i]] += +v;

    const recommendationsKey = `${prefix}|recommendations`;
    const recommendCounts: { [k: string]: number } = {
      recommend_yes: preload.recommend_yes || 0, recommend_conditional: preload.recommend_conditional || 0, recommend_no: preload.recommend_no || 0,
    };
    const recommendKeys = Object.keys(recommendCounts);
    for (const [i, v] of (await ctx.redis.hMGet(recommendationsKey, recommendKeys)).entries())
      if (v) recommendCounts[recommendKeys[i]] += +v;

    return { starCounts, recommendCounts };
  }

  async function getMoviesDataWithRuntimeInfo() {
    return (await Promise.all(
      (configs?.movies || []).map(async (m1: IMovie) => {
        const movieWithRuntime: IRuntimeMovie = structuredClone(m1) as IRuntimeMovie;
        if (movieWithRuntime.image_uri && configs.refs?.[movieWithRuntime.image_uri])
          movieWithRuntime.image_uri = configs.refs[movieWithRuntime.image_uri];

        movieWithRuntime._rating = await getRating(getPrefix(movieWithRuntime.id));
        movieWithRuntime._recommendation = await getRecommendation(getPrefix(movieWithRuntime.id));

        const { starCounts, recommendCounts } = await getRatingsAndRecommendations(getPrefix(movieWithRuntime.id), movieWithRuntime);
        movieWithRuntime._ratings = starCounts;
        movieWithRuntime._recommendations = recommendCounts;

        // Calculate average rating and total votes for each movie right after fetching data
        const { averageRating, totalStarVotes } = calculateMovieAverageRating(movieWithRuntime);
        movieWithRuntime.averageRating = averageRating;
        movieWithRuntime.totalStarVotes = totalStarVotes;

        return movieWithRuntime;
      })
    )) as IRuntimeMovie[];
  }

  // --- App State ---
  const [configs, setConfigs] = useState(async () => await getConfigs());
  const [page, setPage] = useState(Routes.Rating);
  const [movies, setMovies] = useState(async () => await getMoviesDataWithRuntimeInfo()); // MODIFIED: Call new function
  const [movie, setMovie] = useState<IRuntimeMovie>(movies[0] || {
    id: "id", title: "title", recommend_yes: 0, recommend_conditional: 0, recommend_no: 0, release_date: "",
    _rating: undefined, _ratings: { one: 0, two: 0, three: 0, four: 0, five: 0, six: 0, seven: 0, eight: 0, nine: 0, ten: 0 },
    _recommendation: undefined, _recommendations: { recommend_yes: 0, recommend_conditional: 0, recommend_no: 0 },
    averageRating: 0, totalStarVotes: 0 // Initialize new calculated fields
  });
  const [movieIndex, setMovieIndex] = useState(0);
  const [action, setAction] = useState(Actions.Dummy);

  // NEW: State for ranking filters and search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentRankingFilterState, setRankingFilterState] = useState<RankingFilterState>({ type: RankingFilterType.ALL_TIME });

  // NEW: State for available years and months from release dates
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{ year: number, month: number, monthName: string }[]>([]);

  // NEW: UseAsync for calculating available years/months when configs change
  useAsync(async () => {
    if (configs) {
      const { availableYears: years, availableMonths: months } = extractAvailableYearsAndMonths(configs.movies);
      setAvailableYears(years);
      setAvailableMonths(months);
    }
  }, [configs]);


  // NEW: Function to get filtered and ranked movies
  async function getRankedMovies(filterState: RankingFilterState, query: string, allMovies: IRuntimeMovie[]): Promise<IRuntimeMovie[]> {
    let filteredMovies = allMovies;
    const currentYear = getCurrentYear();
    const currentMonth = getCurrentMonth();

    // Step 1: Apply Date Filtering
    if (filterState.type !== RankingFilterType.ALL_TIME) {
      filteredMovies = filteredMovies.filter(movie => {
        if (!movie.release_date) return false; // Exclude movies without release date from date filters

        try {
          const releaseDate = new Date(movie.release_date);
          const releaseYear = releaseDate.getFullYear();
          const releaseMonth = releaseDate.getMonth() + 1; // 1-indexed

          switch (filterState.type) {
            case RankingFilterType.THIS_YEAR:
              return releaseYear === currentYear;
            case RankingFilterType.SPECIFIC_YEAR:
              return filterState.year !== undefined && releaseYear === filterState.year;
            case RankingFilterType.THIS_MONTH:
              return releaseYear === currentYear && releaseMonth === currentMonth;
            case RankingFilterType.SPECIFIC_MONTH:
              return filterState.year !== undefined && filterState.month !== undefined &&
                     releaseYear === filterState.year && releaseMonth === filterState.month;
            default:
              return true; // Should not happen with exhaustive check
          }
        } catch (e) {
          // Handle invalid date format, maybe log an error and exclude
          // console.error("Error parsing release_date for filtering:", movie.release_date, e);
          return false;
        }
      });
    }

    // Step 2: Apply Search Filtering
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filteredMovies = filteredMovies.filter(movie =>
        movie.title.toLowerCase().includes(lowerCaseQuery) ||
        (movie.original_title && movie.original_title.toLowerCase().includes(lowerCaseQuery))
      );
    }

    // Step 3 & 4: Sort by averageRating (descending), then by totalStarVotes (descending) for ties
    const sortedMovies = filteredMovies.sort((a, b) => {
      // Sort by average rating (descending)
      if (b.averageRating !== a.averageRating) {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      // Then by total star votes (descending) for ties
      return (b.totalStarVotes || 0) - (a.totalStarVotes || 0);
    });

    return sortedMovies;
  }

  // NEW: UseAsync for rankedMovies, triggered by movies, filter state, or search query
  const [rankedMovies, setRankedMovies] = useState<IRuntimeMovie[]>([]);
  useAsync(async () => {
    if (movies.length > 0) { // Ensure movies are loaded
      const sorted = await getRankedMovies(currentRankingFilterState, searchQuery, movies);
      setRankedMovies(sorted);
    } else {
      setRankedMovies([]); // Clear if no movies or not loaded yet
    }
  }, [movies, currentRankingFilterState, searchQuery]);


  const { loading: actionLoading } = useAsync(
    async () => {
      switch (action) {
        case Actions.Submit: {
          const prefix = getPrefix(movie.id);
          const currentRating = await getRating(prefix);
          const currentRecommendation = await getRecommendation(prefix);

          const k1_rating = `${prefix}|rating`;
          const k10_ratings = `${prefix}|ratings`;
          const k1_recommendation = `${prefix}|recommendation`;
          const k10_recommendations = `${prefix}|recommendations`;

          const txn = await ctx.redis.watch(k1_rating, k10_ratings, k1_recommendation, k10_recommendations);
          await txn.multi();

          if (movie._rating !== undefined && currentRating === undefined) {
            await txn.hSet(k1_rating, { [ctx.userId!]: `${movie._rating}` });
            await txn.hIncrBy(
              k10_ratings,
              Object.keys(movie._ratings!)[movie._rating - 1],
              1
            );
          }

          if (movie._recommendation !== undefined && currentRecommendation === undefined) {
             await txn.hSet(k1_recommendation, { [ctx.userId!]: movie._recommendation });
             await txn.hIncrBy(
               k10_recommendations,
               movie._recommendation,
               1
             );
          }

          await txn.exec();

          const { starCounts, recommendCounts } = await getRatingsAndRecommendations(prefix, movie);
          return { ratings: starCounts, recommendations: recommendCounts };
        }

        case Actions.Reset: {
          const prefix = getPrefix(movie.id);
          const currentRating = await getRating(prefix);
          const currentRecommendation = await getRecommendation(prefix);

          const k1_rating = `${prefix}|rating`;
          const k10_ratings = `${prefix}|ratings`;
          const k1_recommendation = `${prefix}|recommendation`;
          const k10_recommendations = `${prefix}|recommendations`;

          const txn = await ctx.redis.watch(k1_rating, k10_ratings, k1_recommendation, k10_recommendations);
          await txn.multi();

          if (currentRating !== undefined) {
            await txn.hDel(k1_rating, [ctx.userId!]);
            await txn.hIncrBy(k10_ratings, Object.keys(movie._ratings!)[currentRating - 1], -1);
          }

          if (currentRecommendation !== undefined) {
            await txn.hDel(k1_recommendation, [ctx.userId!]);
            await txn.hIncrBy(k10_recommendations, currentRecommendation, -1);
          }

          await txn.exec();

          const { starCounts, recommendCounts } = await getRatingsAndRecommendations(prefix, movie);
          return { ratings: starCounts, recommendations: recommendCounts };
        }

        default:
          const { _ratings: ratings, _recommendations: recommendations } = movie;
          return { ratings, recommendations };
      }
    },
    {
      depends: [action],
      finally: (r: any, e) => {
        setAction(Actions.Dummy);

        if (r) {
          setMovie({ ...movie, _ratings: r.ratings, _recommendations: r.recommendations });
          setMovies(
            movies.map((m: IRuntimeMovie) => {
              if (movie.id === m.id) {
                m._rating = movie._rating;
                m._ratings = r.ratings;
                m._recommendation = movie._recommendation;
                m._recommendations = r.recommendations;
                // Re-calculate average rating and total votes for the updated movie
                const { averageRating, totalStarVotes } = calculateMovieAverageRating(m);
                m.averageRating = averageRating;
                m.totalStarVotes = totalStarVotes;
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
          configs.movies.map(async (movie: IMovie) => {
            if (movie.image_uri && configs.refs?.[movie.image_uri])
              movie.image_uri = configs.refs[movie.image_uri];

            const [
              one, two, three, four, five, six, seven, eight, nine, ten,
            ] = await ctx.redis.hMGet(
              `${ctx.postId}|movie-${movie.id}|ratings`,
              [
                "one", "two", "three", "four", "five",
                "six", "seven", "eight", "nine", "ten",
              ]
            );

            const [
              rec_yes, rec_conditional, rec_no,
            ] = await ctx.redis.hMGet(
              `${ctx.postId}|movie-${movie.id}|recommendations`,
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

  const props: IProps = {
    page, setPage, movies, movie, setMovie, movieIndex, setMovieIndex, mod: configs.mods?.includes(ctx.userId) || ctx.userId === "t2_tnr2e",
    pagination: movies.length, setAction, showToast, enIn, customize, download,

    // NEW: Props for Ranking Page
    rankedMovies, // The calculated and sorted list
    currentRankingFilterState, // The current filter settings
    setRankingFilterState, // Function to change filter settings
    searchQuery, // The current search query
    setSearchQuery, // Function to update search query
    availableYears, // Dynamic list of years for dropdown
    availableMonths, // Dynamic list of months for dropdown
  };

  switch (page) {
    case Routes.Stats:
      return <StatsPage {...props} />;
    case Routes.Rankings: // NEW: Render RankingPage
      return <RankingPage {...props} />;
    default:
      return <RatingPage {...props} />;
  }
};

Devvit.addCustomPostType({ height: "tall", name: "rate-this-title", render: App });

export default Devvit;