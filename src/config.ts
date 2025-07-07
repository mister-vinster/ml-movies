export enum Actions {
  Dummy,
  Submit,
  Reset,
}

export enum Routes {
  Rating,
  Stats,
  Rankings, // ADDED: New route for the rankings page
}

// NEW: Enum for different ranking filter types based on release date
export enum RankingFilterType {
  ALL_TIME = 'all_time',
  THIS_YEAR = 'this_year',
  SPECIFIC_YEAR = 'specific_year',
  THIS_MONTH = 'this_month', // For current year and month
  SPECIFIC_MONTH = 'specific_month', // For current year and specific month
}

// Helper to get the current year/month for 'this_year'/'this_month' filters
export const getCurrentYear = () => new Date().getFullYear();
export const getCurrentMonth = () => new Date().getMonth() + 1; // getMonth() is 0-indexed