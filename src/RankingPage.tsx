import { Devvit } from "@devvit/public-api";
import { IProps, RankingFilterState } from "./interface.ts"; // Import IProps and RankingFilterState
import { Routes, RankingFilterType, getCurrentMonth, getCurrentYear } from "./config.ts"; // Import filter types and helpers

export const RankingPage: Devvit.BlockComponent<IProps> = (props) => {
  // Local state for selected year/month in dropdowns to manage display
  const currentYear = getCurrentYear();
  const currentMonth = getCurrentMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Handler for setting the filter state
  const handleFilterChange = (type: RankingFilterType, year?: number, month?: number) => {
    props.setRankingFilterState({ type, year, month });
  };

  // Handler for search input
  const handleSearchChange = (query: string) => {
    props.setSearchQuery(query);
  };

  // Determine current active date filter for UI styling
  const isFilterActive = (type: RankingFilterType, year?: number, month?: number) => {
    const current = props.currentRankingFilterState;
    return current.type === type && current.year === year && current.month === month;
  };

  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      {/* Top Bar with Navigation */}
      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="close" onPress={() => props.setPage(Routes.Rating)} /> {/* Go back to Rating Page */}
        <spacer grow />
        <text size="large" weight="bold">Movie Rankings</text>
        <spacer grow />
        {/* You could add a refresh button here if needed, or rely on automatic updates */}
      </hstack>

      {/* Search Input */}
      <textbox
        label="Search Movie Title"
        value={props.searchQuery}
        onTextChange={handleSearchChange}
        placeholder="Type movie name to search..."
        width="100%"
      />

      {/* Date Filters */}
      <vstack alignment="middle center" gap="xsmall" width="100%" padding="small" cornerRadius="medium" backgroundColor="neutral-background-weak">
        <text size="small" weight="bold">Filter by Release Date:</text>
        <hstack gap="xsmall" alignment="center" wrap>
          <button
            text="All Time"
            onPress={() => handleFilterChange(RankingFilterType.ALL_TIME)}
            appearance={isFilterActive(RankingFilterType.ALL_TIME) ? "primary" : "secondary"}
            size="small"
          />
          <button
            text="This Year"
            onPress={() => handleFilterChange(RankingFilterType.THIS_YEAR)}
            appearance={isFilterActive(RankingFilterType.THIS_YEAR) ? "primary" : "secondary"}
            size="small"
          />
          <button
            text="This Month"
            onPress={() => handleFilterChange(RankingFilterType.THIS_MONTH)}
            appearance={isFilterActive(RankingFilterType.THIS_MONTH) ? "primary" : "secondary"}
            size="small"
          />
        </hstack>

        {/* Dynamic Year Dropdown */}
        {props.availableYears.length > 0 && (
          <hstack gap="xsmall" alignment="center" wrap>
            <text size="small">Select Year:</text>
            <dropdown
              options={props.availableYears.map(year => ({
                label: String(year),
                value: String(year)
              }))}
              selected={props.currentRankingFilterState.type === RankingFilterType.SPECIFIC_YEAR ? String(props.currentRankingFilterState.year) : undefined}
              onSelected={(value) => handleFilterChange(RankingFilterType.SPECIFIC_YEAR, Number(value))}
              placeholder="Choose Year"
              size="small"
            />
          </hstack>
        )}

        {/* Dynamic Month Dropdown (for current year or selected year) */}
        {props.availableMonths.filter(m => 
           m.year === (props.currentRankingFilterState.year || currentYear)
        ).length > 0 && (
          <hstack gap="xsmall" alignment="center" wrap>
            <text size="small">Select Month (for {props.currentRankingFilterState.year || currentYear}):</text>
            <dropdown
              options={props.availableMonths
                .filter(m => m.year === (props.currentRankingFilterState.year || currentYear))
                .map(m => ({
                  label: m.monthName,
                  value: String(m.month)
                }))}
              selected={
                (props.currentRankingFilterState.type === RankingFilterType.SPECIFIC_MONTH && props.currentRankingFilterState.year === (props.currentRankingFilterState.year || currentYear))
                ? String(props.currentRankingFilterState.month) : undefined
              }
              onSelected={(value) => handleFilterChange(
                RankingFilterType.SPECIFIC_MONTH, 
                props.currentRankingFilterState.year || currentYear, // Use selected year or current year
                Number(value)
              )}
              placeholder="Choose Month"
              size="small"
            />
          </hstack>
        )}
      </vstack>

      {/* Ranked Movies List */}
      <vstack gap="xsmall" width="100%" grow scrollable>
        {props.rankedMovies.length > 0 ? (
          props.rankedMovies.map((movie, index) => (
            <hstack key={movie.id} alignment="middle" gap="small" padding="xsmall" border="thin" cornerRadius="small" backgroundColor="secondary-background-weak">
              <text size="medium" weight="bold" width="30px">
                #{index + 1}
              </text>
              <image
                resizeMode="contain"
                url={movie.image_uri || "placeholder.jpg"}
                maxWidth="40px"
                maxHeight="60px"
              />
              <vstack grow>
                <text size="medium" weight="bold" overflow="ellipsis">
                  {movie.title}
                </text>
                {movie.averageRating !== undefined && movie.totalStarVotes !== undefined && (
                  <text size="small" color="neutral-content-weak">
                    ⭐ {movie.averageRating.toFixed(1)} ({props.enIn(movie.totalStarVotes)} votes)
                  </text>
                )}
                {movie.release_date && (
                    <text size="xsmall" color="neutral-content-weak">
                        Released: {movie.release_date}
                    </text>
                )}
              </vstack>
            </hstack>
          ))
        ) : (
          <text size="medium" alignment="center" color="neutral-content-weak">
            No movies found for this filter/search.
          </text>
        )}
      </vstack>
    </vstack>
  );
};