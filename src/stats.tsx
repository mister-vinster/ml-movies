import { Devvit } from "@devvit/public-api";
import { round } from "lodash";

import { IProps } from "./interface.ts"; // Now imports IRuntimeMovie
import { Routes } from "./config.ts";

export const StatsPage: Devvit.BlockComponent<IProps> = (props) => {
  function getRatingsSummary(ratings: { [k: string]: number }) {
    const values: number[] = Object.values(ratings);
    const count = values.reduce((m, i) => m + i, 0); // Total number of ratings

    let totalScore = 0;
    Object.keys(ratings).forEach((key, index) => {
      const starValue = index + 1; // "one" is index 0 (star 1), "two" is index 1 (star 2), etc.
      totalScore += ratings[key] * starValue;
    });

    const avg = count ? totalScore / count : 0;

    return (
      <hstack alignment="bottom center" gap="small">
        <text size="xlarge" weight="bold">
          {round(avg, 1)}
        </text>
        <text size="small">from {props.enIn(count)} ratings</text>
      </hstack>
    );
  }

  function getRatingsChart(ratings: { [k: string]: number }) {
    const values: number[] = Object.values(ratings);
    const count = values.reduce((m, i) => m + i, 0); // Total number of ratings

    const starData = Object.keys(ratings).map((key, index) => ({
      star: index + 1, // 1 to 10
      count: ratings[key] || 0,
    }));

    const sortedStarData = starData.sort((a, b) => b.star - a.star);

    return (
      <vstack alignment="middle center">
        {sortedStarData.map((data, index) => (
          <vstack width="192px" key={data.star}>
            {index > 0 ? <spacer size="small" /> : null}
            <hstack alignment="bottom center" gap="small">
              {data.count > 0 ? (
                <text
                  maxWidth="70%"
                  overflow="ellipsis"
                  size="xsmall"
                  weight="bold"
                >
                  {props.enIn(data.count)} ~ {count ? round((data.count / count) * 100, 1) : 0}%
                </text>
              ) : (
                ""
              )}
              <spacer grow />
              <text size="xsmall">
                {data.star} {data.star === 1 ? "Star" : "Stars"}
              </text>
            </hstack>
            <spacer size="xsmall" />
            <vstack backgroundColor="secondary-background" cornerRadius="full">
              <hstack
                backgroundColor="primary-background"
                width={`${count ? round((data.count / count) * 100, 1) : 0}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
          </vstack>
        ))}
      </vstack>
    );
  }

  // NEW function to display recommendation summary
  function getRecommendationsSummary(recommendations: { [k: string]: number }) {
    const totalRecommendations = Object.values(recommendations).reduce((sum, count) => sum + count, 0);

    if (totalRecommendations === 0) {
      return (
        <text size="small" weight="bold" color="tertiary">
          No recommendations yet.
        </text>
      );
    }

    // Calculate percentages for each recommendation type
    const yesCount = recommendations.recommend_yes || 0;
    const conditionalCount = recommendations.recommend_conditional || 0;
    const noCount = recommendations.recommend_no || 0;

    const yesPercent = totalRecommendations ? round((yesCount / totalRecommendations) * 100, 1) : 0;
    const conditionalPercent = totalRecommendations ? round((conditionalCount / totalRecommendations) * 100, 1) : 0;
    const noPercent = totalRecommendations ? round((noCount / totalRecommendations) * 100, 1) : 0;

    return (
      <vstack alignment="middle center" gap="xsmall" padding="medium">
        <text size="medium" weight="bold">Recommendation Breakdown:</text>
        <hstack alignment="center" gap="medium" wrap>
          <text size="small" color="green">
            Yes: {props.enIn(yesCount)} ({yesPercent}%)
          </text>
          <text size="small" color="orange">
            Conditional: {props.enIn(conditionalCount)} ({conditionalPercent}%)
          </text>
          <text size="small" color="red">
            No: {props.enIn(noCount)} ({noPercent}%)
          </text>
        </hstack>
      </vstack>
    );
  }

  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      <spacer grow />

      <hstack alignment="bottom center" gap="small" width="100%">
        <image
          resizeMode="contain"
          url={props.movie.image_uri || "placeholder.jpg"}
          maxWidth="48px"
          maxHeight="72px"
        />

        <vstack maxWidth="60%">
          <spacer size="small" />
          <text size="xsmall">Movie</text>
          <text overflow="ellipsis" size="xlarge" weight="bold">
            {props.movie.title}
          </text>
          {props.movie.original_title ? (
            <text overflow="ellipsis" size="xsmall">
              {props.movie.original_title}
            </text>
          ) : (
            ""
          )}
          <spacer size="small" />
          {props.movie.release_date ? (
            <vstack>
              <text size="xsmall">Release Date</text>
              <text size="small" weight="bold" wrap>
                {props.movie.release_date}
              </text>
              <spacer size="xsmall" />
            </vstack>
          ) : (
            ""
          )}
          {props.movie.secondary_key && props.movie.secondary_value ? (
            <vstack>
              <text size="xsmall">{props.movie.secondary_key}</text>
              <text size="small" weight="bold" wrap>
                {props.movie.secondary_value}
              </text>
              <spacer size="xsmall" />
            </vstack>
          ) : (
            ""
          )}
          {props.movie.tertiary_key ? (
            <vstack>
              <text size="xsmall">Other Info</text>
              <text size="small" weight="bold" wrap>
                {props.movie.tertiary_key}
              </text>
              <spacer size="xsmall" />
            </vstack>
          ) : (
            ""
          )}
        </vstack>
      </hstack>

      {/* Display Star Ratings Summary and Chart */}
      {getRatingsSummary(props.movie._ratings || {})}
      {getRatingsChart(props.movie._ratings || {})}

      {/* NEW: Display Recommendation Summary */}
      {getRecommendationsSummary(props.movie._recommendations || {})}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="close" onPress={() => props.setPage(Routes.Rating)} />
        <spacer grow />
      </hstack>
    </vstack>
  );
};