import { RankingFilterType } from './config'; // NEW: Import RankingFilterType

export interface IMovie {
  id: string;
  image_uri?: string;
  title: string;
  original_title?: string;
  release_date?: string; // e.g., "YYYY-MM-DD"
  secondary_key?: string;
  secondary_value?: string;
  tertiary_key?: string;
  one?: number;
  two?: number;
  three?: number;
  four?: number;
  five?: number;
  six?: number;
  seven?: number;
  eight?: number;
  nine?: number;
  ten?: number;
  // --- New Recommendation fields (for raw config) ---
  recommend_yes?: number;
  recommend_conditional?: number;
  recommend_no?: number;
}

// Define a type for the Movie object as it's processed and passed around internally in the app
// It extends IMovie (which comes from configs) and adds runtime-specific properties
export interface IRuntimeMovie extends IMovie {
  _rating?: number; // The current user's submitted star rating for this movie (undefined if not rated)
  _ratings?: { [k: string]: number }; // The aggregated counts of all star ratings for this movie
  _recommendation?: string; // The current user's submitted recommendation choice (e.g., "yes", "conditional", "no")
  _recommendations?: { [k: string]: number }; // The aggregated counts of all recommendation choices for this movie
  // NEW: Calculated fields for ranking
  averageRating?: number; // Calculated average star rating for this movie
  totalStarVotes?: number; // Total number of star votes for this movie
}

// NEW: Interface to define the structure of the ranking filter state
export interface RankingFilterState {
  type: RankingFilterType;
  year?: number;  // Specific year selected when type is SPECIFIC_YEAR or SPECIFIC_MONTH
  month?: number; // Specific month selected when type is SPECIFIC_MONTH (1-12)
}

export interface IProps {
  page: number;
  setPage: (page: number) => void;
  movies: any[]; // 'movies' array still uses 'any' as it contains a mix from config and runtime added fields
  movie: IRuntimeMovie;
  setMovie: (movie: IRuntimeMovie) => void;
  movieIndex: number;
  setMovieIndex: (movieIndex: number) => void;
  mod: boolean;
  pagination: number;
  setAction: (action: any) => void;
  // actionLoading: boolean;
  showToast: (text: string) => void;
  enIn: (v: number, locale?: string, opts?: any) => string;
  customize: () => void;
  download: () => void;

  // --- NEW: Props for Ranking Page ---
  rankedMovies: IRuntimeMovie[]; // The list of movies sorted by rank
  currentRankingFilterState: RankingFilterState; // The currently active filter (all-time, this year, etc.)
  setRankingFilterState: (state: RankingFilterState) => void; // Function to update the filter
  searchQuery: string; // The current search query
  setSearchQuery: (query: string) => void; // Function to update the search query
  availableYears: number[]; // List of unique years from movie release dates
  availableMonths: { year: number, month: number, monthName: string }[]; // List of unique months from movie release dates for a given year
}

export interface IConfigs {
  mods: string[];
  movies: IMovie[];
  refs?: { [k: string]: string };
}