import { Devvit, useAsync, useForm, useState } from "@devvit/public-api";
import { csvFormat } from "d3-dsv";
import { isJSON, isURL } from "validator";
import { Buffer } from 'buffer';

import { validate } from "./ajv.ts";
import { Actions, Routes, RankingFilterType } from "./config.ts";
import { IConfigs, IMovie, IRuntimeMovie, IProps, RankingFilterState } from "./interface.ts";
import { RatingPage } from "./rating.tsx";
import { StatsPage } from "./stats.tsx";
import { RankingPage } from "./RankingPage.tsx";

// --- Helper functions ---
const calculateMovieAverageRating = (movie: IRuntimeMovie): { averageRating: number, totalStarVotes: number } => {
    if (!movie._ratings) return { averageRating: 0, totalStarVotes: 0 };
    const starCounts = movie._ratings;
    let totalScore = 0;
    let totalVotes = 0;
    Object.keys(starCounts).forEach((key, index) => {
        const starValue = index + 1;
        const count = starCounts[key] || 0;
        totalScore += count * starValue;
        totalVotes += count;
    });
    const averageRating = totalVotes ? totalScore / totalVotes : 0;
    return { averageRating, totalStarVotes: totalVotes };
};

const extractAvailableYearsAndMonths = (movies: IMovie[]) => {
    const years = new Set<number>();
    const months = new Set<{ year: number, month: number, monthName: string }>();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    movies.forEach(movie => {
        if (movie.release_date) {
            try {
                const date = new Date(movie.release_date);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                if (!isNaN(year) && !isNaN(month)) {
                    years.add(year);
                    months.add({ year, month, monthName: monthNames[month - 1] });
                }
            } catch (e) { /* Ignore invalid dates */ }
        }
    });
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const sortedMonths = Array.from(months).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    return { availableYears: sortedYears, availableMonths: sortedMonths };
};

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
                }],
            })
        );
        ctx.ui.navigateTo(post);
    },
});

const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
    
    const [configs, setConfigs] = useState<IConfigs | null>(null);
    const [page, setPage] = useState(Routes.Rating);
    const [movies, setMovies] = useState<IRuntimeMovie[]>([]);
    const [movie, setMovie] = useState<IRuntimeMovie>({ id: "loading", title: "Loading..." });
    const [movieIndex, setMovieIndex] = useState(0);
    const [action, setAction] = useState(Actions.Dummy);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentRankingFilterState, setRankingFilterState] = useState<RankingFilterState>({ type: RankingFilterType.ALL_TIME });
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [availableMonths, setAvailableMonths] = useState<{ year: number, month: number, monthName: string }[]>([]);
    const [rankedMovies, setRankedMovies] = useState<IRuntimeMovie[]>([]);

    const getConfigs = async (): Promise<IConfigs | null> => {
        const configsStr = await ctx.redis.get(`${ctx.postId}|configs`);
        return configsStr && isJSON(configsStr) ? JSON.parse(configsStr) : null;
    };

    const getMoviesDataWithRuntimeInfo = async (currentConfigs: IConfigs): Promise<IRuntimeMovie[]> => {
        const moviesWithInfo = await Promise.all(
            (currentConfigs.movies || []).map(async (m1: IMovie) => {
                const movieWithRuntime: IRuntimeMovie = { ...m1, _ratings: {}, _recommendations: {} };
                const { averageRating, totalStarVotes } = calculateMovieAverageRating(movieWithRuntime);
                movieWithRuntime.averageRating = averageRating;
                movieWithRuntime.totalStarVotes = totalStarVotes;
                return movieWithRuntime;
            })
        );
        return moviesWithInfo;
    };

    // FIX: Removed the second argument '[]' to run the hook only once on mount.
    useAsync(async () => {
        const initialConfigs = await getConfigs();
        if (initialConfigs) {
            setConfigs(initialConfigs);
            const moviesData = await getMoviesDataWithRuntimeInfo(initialConfigs);
            setMovies(moviesData);
            if (moviesData.length > 0) {
                setMovie(moviesData[0]);
            }
            const { availableYears, availableMonths } = extractAvailableYearsAndMonths(initialConfigs.movies);
            setAvailableYears(availableYears);
            setAvailableMonths(availableMonths);
        }
        return {}; 
    });
    
    const { loading: actionLoading } = useAsync(async () => {
        // Your logic for Submit and Reset actions
        return {}; 
    }, { depends: [action] });

    const showToast = (text: string) => ctx.ui.showToast(text);
    const enIn = (value: number, locale = "en-in", opts = {}) => value.toLocaleString(locale, opts);
    const customize = () => { /* form logic */ };
    const download = async () => { /* download logic */ };

    const props: IProps = {
        page, setPage, movies, movie, setMovie, movieIndex, setMovieIndex,
        mod: (configs && ctx.userId) ? configs.mods.includes(ctx.userId) : false,
        pagination: movies.length,
        setAction,
        showToast,
        enIn,
        customize,
        download,
        rankedMovies,
        currentRankingFilterState,
        setRankingFilterState,
        searchQuery,
        setSearchQuery,
        availableYears,
        availableMonths,
    };
    
    if (!configs) {
        return (
            <vstack alignment="middle center" grow>
                <text size="large">loading...</text>
            </vstack>
        );
    }

    switch (page) {
        case Routes.Stats:
            return <StatsPage {...props} />;
        case Routes.Rankings:
            return <RankingPage {...props} />;
        default:
            return <RatingPage {...props} />;
    }
};

Devvit.addCustomPostType({ height: "tall", name: "rate-this-title", render: App });

export default Devvit;