import { RankingFilterType } from './config';

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
  recommend_yes?: number;
  recommend_conditional?: number;
  recommend_no?: number;
  [key: string]: any; // FIX: Index signature for JSON compatibility
}

export interface IRuntimeMovie extends IMovie {
  _rating?: number;
  _ratings?: { [k: string]: number };
  _recommendation?: string;
  _recommendations?: { [k: string]: number };
  averageRating?: number;
  totalStarVotes?: number;
  [key: string]: any; // FIX: Index signature for JSON compatibility
}

export interface RankingFilterState {
  type: RankingFilterType;
  year?: number;
  month?: number;
  [key: string]: any; // FIX: Index signature for JSON compatibility
}

export interface IProps {
  page: number;
  setPage: (page: number) => void;
  movies: IRuntimeMovie[];
  movie: IRuntimeMovie;
  setMovie: (movie: IRuntimeMovie) => void;
  movieIndex: number;
  setMovieIndex: (movieIndex: number) => void;
  mod: boolean;
  pagination: number;
  setAction: (action: any) => void;
  showToast: (text: string) => void;
  enIn: (v: number, locale?: string, opts?: any) => string;
  customize: () => void;
  download: () => void;
  rankedMovies: IRuntimeMovie[];
  currentRankingFilterState: RankingFilterState;
  setRankingFilterState: (state: RankingFilterState) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  availableYears: number[];
  availableMonths: { year: number, month: number, monthName: string }[];
}

export interface IConfigs {
  mods: string[];
  movies: IMovie[];
  refs?: { [k: string]: string };
  [key: string]: any; // FIX: Index signature for JSON compatibility
}