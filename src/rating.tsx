import { Devvit, useState } from "@devvit/public-api";
import { round } from "lodash";

import { IProps } from "./interface.ts";
import { Actions, Routes } from "./config.ts";

export const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  const [rating, setRating] = useState(4);

  function getRatingText(rating: number) {
    return `${[...Array(Math.floor(rating / 2))].map(() => "🌕").join("")}${[
      ...Array(Math.floor(rating % 2)),
    ]
      .map(() => "🌗")
      .join("")}`;
  }

  function getRatingsSummary(ratings: { [k: string]: number }) {
    const values: number[] = Object.values(ratings);
    const count = values.reduce((m, i) => m + i, 0);
    const avg = count
      ? values.reduce((m, item, i) => m + item * (i + 1), 0) / count / 2
      : 0;
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
          height="144px"
          imageHeight={144}
          imageWidth={96}
          resizeMode="cover"
          url={props.movie.image_uri || "placeholder.jpg"}
          width="96px"
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
          {props.movie.secondary_key && props.movie.secondary_value ? (
            <vstack>
              <text size="xsmall">{props.movie.secondary_key}</text>
              <text size="small" weight="bold" wrap>
                {props.movie.secondary_value}
              </text>
              <spacer size="small" />
            </vstack>
          ) : (
            ""
          )}
        </vstack>
      </hstack>

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
              if (0 < rating) setRating(rating - 1);
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
                width={`${rating * 11.11}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
            <spacer size="xsmall" />
            <text size="xsmall" weight="bold">
              {getRatingText(rating + 1)}
            </text>
          </vstack>
          <button
            icon="add"
            onPress={() => {
              if (rating < 9) setRating(rating + 1);
            }}
          />
        </hstack>
      ) : (
        <hstack cornerRadius="full" border="thin" padding="small">
          <text size="small" weight="bold">
            {getRatingText(props.movie._rating + 1)} rating
          </text>
        </hstack>
      )}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="statistics" onPress={() => props.setPage(Routes.Stats)} />
        {getRatingsSummary(props.movie._ratings || {})}
        {props.movie._rating === undefined ? (
          <button
            appearance="primary"
            // disabled={props.actionLoading}
            icon="checkmark"
            onPress={() => {
              props.setMovie({ ...props.movie, _rating: rating });
              props.setAction(Actions.Submit);
              props.showToast(
                `${
                  props.movie.original_title || props.movie.title
                } ~ ${getRatingText(rating + 1)} rating`
              );
            }}
          />
        ) : (
          <button
            appearance="destructive"
            // disabled={props.actionLoading}
            icon="undo"
            onPress={() => {
              props.setMovie({ ...props.movie, _rating: undefined });
              props.setAction(Actions.Reset);
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};
