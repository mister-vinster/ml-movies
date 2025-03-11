import { Devvit } from "@devvit/public-api";
import { round } from "lodash";

import { IProps } from "./interface.ts";
import { Actions, Routes } from "./config.ts";

export const RatingPage: Devvit.BlockComponent<IProps> = (props) => {
  function getRatingText(rating: number) {
    return `${[...Array(Math.floor(rating / 2))].map(() => "🌕").join("")}${[
      ...Array(Math.floor(rating % 2)),
    ]
      .map(() => "🌗")
      .join("")}`;
  }

  function getRatingsSummary() {
    const values: number[] = Object.values(props.ratings);
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
            // disabled={props.movieIndexLoading}
            icon="back"
            onPress={() => props.setMovieIndex(props.movieIndex - 1)}
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
        <button
          // disabled={props.movieIndexLoading}
          icon="forward"
          onPress={() => props.setMovieIndex(props.movieIndex + 1)}
        />
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

      {props.flag ? (
        <hstack cornerRadius="full" border="thin" padding="small">
          <text size="small" weight="bold">
            {getRatingText(props.rating)} rating
          </text>
        </hstack>
      ) : (
        <hstack
          alignment="bottom center"
          border="thin"
          cornerRadius="full"
          gap="small"
          padding="small"
        >
          <button
            // disabled={props.actionLoading || props.rating <= 1}
            icon="subtract"
            onPress={() => {
              if (1 < props.rating) props.setRating(props.rating - 1);
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
                width={`${(props.rating - 1) * 11.11}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
            <spacer size="xsmall" />
            <text size="xsmall" weight="bold">
              {getRatingText(props.rating)}
            </text>
          </vstack>
          <button
            // disabled={props.actionLoading || 10 <= props.rating}
            icon="add"
            onPress={() => {
              if (props.rating < 10) props.setRating(props.rating + 1);
            }}
          />
        </hstack>
      )}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button
          // disabled={props.movieLoading}
          icon="statistics"
          onPress={() => props.setPage(Routes.Stats)}
        />
        {getRatingsSummary()}
        {props.flag ? (
          <button
            appearance="destructive"
            // disabled={props.movieLoading || props.actionLoading}
            icon="undo"
            onPress={() => props.setAction(Actions.Reset)}
          />
        ) : (
          <button
            appearance="primary"
            // disabled={props.movieLoading || props.actionLoading}
            icon="checkmark"
            onPress={() => {
              props.setAction(Actions.Submit);
              props.showToast(
                `${
                  props.movie.original_title || props.movie.title
                } ~ ${getRatingText(props.rating)} rating`
              );
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};
