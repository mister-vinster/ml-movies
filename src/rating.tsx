import { Devvit, useState } from "@devvit/public-api";
import { round } from "lodash";

import { IProps } from "./interface.ts"; // Now imports IRuntimeMovie
import { Actions, Routes } from "./config.ts";

export const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  // Adjusted default rating to 5 (middle of 1-10 scale)
  const [rating, setRating] = useState(5); // This state represents the user's selected star rating (1-10)

  // NEW: State for the user's recommendation choice
  // Will store "recommend_yes", "recommend_conditional", "recommend_no", or undefined
  const [recommendationChoice, setRecommendationChoice] = useState<string | undefined>(undefined);

  // New function to display stars for a 1-10 full-star system
  function getRatingText(currentRating: number) {
    if (currentRating < 1 || currentRating > 10) return "Not Rated";
    return "🌕".repeat(currentRating); // Repeat full moon emoji for each star
  }

  // NEW: Function to get the display text for a recommendation choice
  function getRecommendationDisplayText(choice: string | undefined): string {
    switch (choice) {
      case "recommend_yes":
        return "Yes, Recommended!";
      case "recommend_conditional":
        return "Yes, but conditionally recommended.";
      case "recommend_no":
        return "No, not recommended.";
      default:
        return "Not recommended yet."; // Should ideally not be seen if choice is undefined
    }
  }

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

  // Determine if the user has already rated OR recommended this movie
  // If either has been done, they shouldn't see the input controls
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
          resizeMode="contain"
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
          ) : (
            // This else block indicates user *has* rated, but we want to show a combined view,
            // so this entire block will be removed and replaced by a unified display below.
            // Keeping it for now to illustrate removal if only rating was submitted.
            // We'll replace this with the combined "already submitted" display below.
            <hstack cornerRadius="full" border="thin" padding="small">
              <text size="small" weight="bold">
                Your Rating: {getRatingText(props.movie._rating)}{" "}
              </text>
            </hstack>
          )}

          {/* NEW: Recommendation Input Section */}
          {props.movie._recommendation === undefined ? (
            <vstack alignment="top center" gap="xsmall" width="100%">
              <text size="small" weight="bold">
                Would you recommend {props.movie.title}?
              </text>
              <hstack gap="xsmall" alignment="center">
                <button
                  text="Yes"
                  onPress={() => setRecommendationChoice("recommend_yes")}
                  appearance={recommendationChoice === "recommend_yes" ? "primary" : "secondary"}
                />
                <button
                  text="Yes, but only to fans"
                  onPress={() => setRecommendationChoice("recommend_conditional")}
                  appearance={recommendationChoice === "recommend_conditional" ? "primary" : "secondary"}
                />
                <button
                  text="No"
                  onPress={() => setRecommendationChoice("recommend_no")}
                  appearance={recommendationChoice === "recommend_no" ? "primary" : "secondary"}
                />
              </hstack>
              {recommendationChoice ? (
                <text size="xsmall" weight="bold">
                  Selected: {getRecommendationDisplayText(recommendationChoice)}
                </text>
              ) : null}
            </vstack>
          ) : (
            // This else block indicates user *has* recommended.
            // We'll replace this with the combined "already submitted" display below.
            <hstack cornerRadius="full" border="thin" padding="small">
              <text size="small" weight="bold">
                Your Recommendation: {getRecommendationDisplayText(props.movie._recommendation)}
              </text>
            </hstack>
          )}
        </vstack>
      ) : (
        // COMBINED DISPLAY FOR ALREADY SUBMITTED RATING/RECOMMENDATION
        <vstack alignment="middle center" gap="small" width="100%">
          {props.movie._rating !== undefined ? (
            <hstack cornerRadius="full" border="thin" padding="small">
              <text size="small" weight="bold">
                Your Rating: {getRatingText(props.movie._rating)}
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
        {getRatingsSummary(props.movie._ratings || {})}
        {/* Submit / Undo buttons are now based on combined `hasUserRatedOrRecommended` state */}
        {!hasUserRatedOrRecommended ? (
          <button
            appearance="primary"
            // disabled={props.actionLoading}
            icon="checkmark"
            onPress={() => {
              // Only set rating if a rating was selected, otherwise leave undefined
              const ratingToSubmit = rating !== 0 ? rating : undefined; 

              props.setMovie({
                ...props.movie,
                _rating: ratingToSubmit, // Set star rating
                _recommendation: recommendationChoice, // Set recommendation
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
            // disabled={props.actionLoading}
            icon="undo"
            onPress={() => {
              props.setMovie({ ...props.movie, _rating: undefined, _recommendation: undefined }); // Reset both
              props.setAction(Actions.Reset);
              // Reset local state if undoing
              setRating(5); // Reset star rating input default
              setRecommendationChoice(undefined); // Reset recommendation input default
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};