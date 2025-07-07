import { Devvit, useState } from "@devvit/public-api";
import { round } from "lodash";

import { IProps } from "./interface.ts";
import { Actions, Routes } from "./config.ts";

export const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  const [rating, setRating] = useState(5);
  const [recommendationChoice, setRecommendationChoice] = useState<string | null>(null);

  function getRatingText(currentRating: number) {
    if (currentRating < 1 || currentRating > 10) return "Not Rated";
    return "🌕".repeat(currentRating);
  }

  function getRecommendationDisplayText(choice: string | undefined | null): string {
    switch (choice) {
      case "recommend_yes":
        return "Yes, Recommended!";
      case "recommend_conditional":
        return "Yes, but only to fans of the cast/director/franchise/genre.";
      case "recommend_no":
        return "No, not recommended.";
      default:
        return "Not recommended yet.";
    }
  }

  function getRatingsSummary(ratings: { [k: string]: number }) {
    const values: number[] = Object.values(ratings);
    const count = values.reduce((m, i) => m + i, 0);

    let totalScore = 0;
    Object.keys(ratings).forEach((key, index) => {
      const starValue = index + 1;
      const count = ratings[key] || 0; // Ensure count is a number
      totalScore += count * starValue;
    });

    const avg = count ? totalScore / count : 0;

    return (
      <hstack alignment="bottom center" gap="small" grow>
        <text size="xlarge" weight="bold">
          {round(avg, 1)}
        </text>
        <text maxWidth="80%" overflow="ellipsis" size="small">
          from {props.enIn(count)} ratings
        </text>
      </hstack>
    );
  }

  const hasUserRatedOrRecommended = props.movie._rating !== undefined || props.movie._recommendation !== undefined;

  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      <hstack alignment="middle center" gap="small" width="100%">
        {0 < props.movieIndex ? (
          <button
            icon="back"
            onPress={() => {
              const i = props.movieIndex - 1;
              props.setMovieIndex(i);
              if (props.movies.length)
                props.setMovie(props.movies[i % props.movies.length]);
            }}
          />
        ) : props.mod ? (
          <hstack gap="small">
            <button icon="customize" onPress={props.customize} />
            <button icon="download" onPress={props.download} />
          </hstack>
        ) : (
          ""
        )}
        <spacer grow />
        {1 < props.pagination ? (
          <button
            icon="forward"
            onPress={() => {
              const i = props.movieIndex + 1;
              props.setMovieIndex(i);
              if (props.movies.length)
                props.setMovie(props.movies[i % props.movies.length]);
            }}
          />
        ) : (
          ""
        )}
      </hstack>

      <spacer grow />

      <hstack alignment="bottom center" gap="small" width="100%">
        <image
          // FIX: Re-added imageWidth and imageHeight, changed resizeMode to string literal "fit"
          imageWidth={96} // Standard poster width
          imageHeight={144} // Standard poster height (2:3 aspect)
          resizeMode="fit" // FIX: Use string literal "fit"
          url={props.movie.image_uri || "placeholder.jpg"}
          maxWidth="96px"
          maxHeight="144px"
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

      {/* Conditional rendering for rating and recommendation input vs. display */}
      {!hasUserRatedOrRecommended ? (
        <vstack alignment="middle center" gap="medium" width="100%">
          {/* Star Rating Input Section */}
          {props.movie._rating === undefined ? (
            <hstack
              alignment="bottom center"
              border="thin"
              cornerRadius="full"
              gap="small"
              padding="small"
            >
              <button
                icon="subtract"
                onPress={() => {
                  if (1 < rating) setRating(rating - 1);
                }}
              />
              <vstack alignment="top center">
                <text size="small" weight="bold">
                  how would you rate this movie?
                </text>
                <spacer size="small" />
                <vstack
                  backgroundColor="secondary-background"
                  cornerRadius="full"
                  width="60%"
                >
                  <hstack
                    backgroundColor="primary-background"
                    width={`${rating * 10}%`}
                  >
                    <spacer size="xsmall" shape="square" />
                  </hstack>
                </vstack>
                <spacer size="xsmall" />
                <text size="xsmall" weight="bold">
                  {getRatingText(rating)}
                </text>
              </vstack>
              <button
                icon="add"
                onPress={() => {
                  if (rating < 10) setRating(rating + 1);
                }}
              />
            </hstack>
          ) : null}

          {/* Recommendation Input Section */}
          {props.movie._recommendation === undefined ? (
            <vstack alignment="top center" gap="small" width="100%"> {/* FIX: gap="small" */}
              <text size="small" weight="bold">
                Would you recommend {props.movie.title}?
              </text>
              <hstack gap="small" alignment="center"> {/* FIX: gap="small" */}
                <button
                  onPress={() => setRecommendationChoice("recommend_yes")}
                  appearance={recommendationChoice === "recommend_yes" ? "primary" : "secondary"}
                > {/* FIX: Button text as children */}
                  Yes
                </button>
                <button
                  onPress={() => setRecommendationChoice("recommend_conditional")}
                  appearance={recommendationChoice === "recommend_conditional" ? "primary" : "secondary"}
                > {/* FIX: Button text as children */}
                  Yes, but only to fans of the cast/director/franchise/genre
                </button>
                <button
                  onPress={() => setRecommendationChoice("recommend_no")}
                  appearance={recommendationChoice === "recommend_no" ? "primary" : "secondary"}
                > {/* FIX: Button text as children */}
                  No
                </button>
              </hstack>
              {recommendationChoice !== null ? (
                <text size="xsmall" weight="bold">
                  Selected: {getRecommendationDisplayText(recommendationChoice)}
                </text>
              ) : null}
            </vstack>
          ) : null}
        </vstack>
      ) : (
        // COMBINED DISPLAY FOR ALREADY SUBMITTED RATING/RECOMMENDATION
        <vstack alignment="middle center" gap="small" width="100%">
          {props.movie._rating !== undefined ? (
            <hstack cornerRadius="full" border="thin" padding="small">
              <text size="small" weight="bold">
                Your Rating: {getRatingText(props.movie._rating ?? 0)} {/* FIX: Add ?? 0 to ensure number */}
              </text>
            </hstack>
          ) : null}
          {props.movie._recommendation !== undefined ? (
            <hstack cornerRadius="full" border="thin" padding="small">
              <text size="small" weight="bold">
                Your Recommendation: {getRecommendationDisplayText(props.movie._recommendation)}
              </text>
            </hstack>
          ) : null}
        </vstack>
      )}


      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="statistics" onPress={() => props.setPage(Routes.Stats)} />
        {/* NEW: Rankings Button */}
        {/* FIX: Ensure 'trophy' is a valid icon name or use an alternative like 'star' */}
        <button icon="trophy" text="Rankings" onPress={() => props.setPage(Routes.Rankings)} />
        {getRatingsSummary(props.movie._ratings || {})}
        {/* Submit / Undo buttons are now based on combined `hasUserRatedOrRecommended` state */}
        {!hasUserRatedOrRecommended ? (
          <button
            appearance="primary"
            icon="checkmark"
            onPress={() => {
              const ratingToSubmit = rating !== 0 ? rating : undefined; 

              props.setMovie({
                ...props.movie,
                _rating: ratingToSubmit,
                _recommendation: recommendationChoice || undefined,
              });
              props.setAction(Actions.Submit);
              props.showToast(
                `${
                  props.movie.original_title || props.movie.title
                } ~ ${ratingToSubmit !== undefined ? getRatingText(ratingToSubmit) + " rating" : ""} ${recommendationChoice ? getRecommendationDisplayText(recommendationChoice) : ""}`
              );
            }}
          />
        ) : (
          <button
            appearance="destructive"
            icon="undo"
            onPress={() => {
              props.setMovie({ ...props.movie, _rating: undefined, _recommendation: undefined });
              props.setAction(Actions.Reset);
              setRating(5);
              setRecommendationChoice(null);
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};