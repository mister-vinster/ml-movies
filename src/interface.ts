export interface IMovie {
  id: string;
  image_uri?: string;
  title: string;
  original_title?: string;
  release_date?: string;
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
}

export interface IProps {
  page: number;
  setPage: (page: number) => void;
  movies: any[]; // 'movies' array still uses 'any' as it contains a mix from config and runtime added fields
  movie: IRuntimeMovie; // MODIFIED: Use the new IRuntimeMovie type for the individual movie object
  setMovie: (movie: IRuntimeMovie) => void; // MODIFIED: setMovie now expects IRuntimeMovie
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
}

export interface IConfigs {
  mods: string[];
  movies: IMovie[]; // This is still IMovie[], as it's from the raw config JSON
  refs?: { [k: string]: string };
}