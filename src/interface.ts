export interface IProps {
  page: number;
  setPage: (page: number) => void;
  movieIndex: number;
  setMovieIndex: (movie: number) => void;
  movieIndexLoading: boolean;
  movie: any;
  movieLoading: boolean;
  flag: boolean;
  rating: number;
  setRating: (rating: number) => void;
  ratings: any;
  setAction: (action: number) => void;
  actionLoading: boolean;
  showToast: (text: string) => void;
  enIn: (v: number, locale?: string, opts?: any) => string;
  mod: boolean;
  customize: () => void;
}
