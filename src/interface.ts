export interface IProps {
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
