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
    const avg =
      values.reduce((m, item, i) => m + item * (i + 1), 0) / count / 2;
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
            disabled={props.movieIndexLoading}
            icon="back"
            onPress={() => props.setMovieIndex(props.movieIndex - 1)}
          />
        ) : (
          ""
        )}
        <spacer grow />
        <button
          disabled={props.movieIndexLoading}
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
          url={`ltrbxd/${props.movie.ltrbxd_slug}.jpg`}
          width="96px"
        />

        <vstack maxWidth="60%">
          <spacer size="small" />
          <text size="xsmall">Movie</text>
          <text overflow="ellipsis" size="xlarge" weight="bold">
            {props.movie.name}
          </text>
          {props.movie.originalName ? (
            <text overflow="ellipsis" size="xsmall">
              {props.movie.originalName}
            </text>
          ) : (
            ""
          )}
          <spacer size="small" />
          <text size="xsmall">
            Director
            {1 < Object.values(props.movie.director).length ? "s" : ""}
          </text>
          <text size="small" weight="bold" wrap>
            {Object.values(props.movie.director).join(" | ")}
          </text>
          <spacer size="small" />
        </vstack>
      </hstack>

      <spacer size="small" />

      {props.flag ? (
        <text size="small" weight="bold">
          {getRatingText(props.rating)} rating
        </text>
      ) : (
        <hstack alignment="bottom center" gap="medium" width="100%">
          <button
            disabled={props.actionLoading || props.rating <= 1}
            icon="subtract"
            onPress={() => props.setRating(props.rating - 1)}
          />
          <vstack alignment="top center" maxWidth="60%">
            <text
              maxWidth="100%"
              overflow="ellipsis"
              size="small"
              weight="bold"
            >
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
            disabled={props.actionLoading || 10 <= props.rating}
            icon="add"
            onPress={() => props.setRating(props.rating + 1)}
          />
        </hstack>
      )}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button
          disabled={props.movieLoading}
          icon="statistics"
          onPress={() => props.setPage(Routes.Stats)}
        />
        {getRatingsSummary()}
        {props.flag ? (
          <button
            appearance="destructive"
            disabled={props.movieLoading || props.actionLoading}
            icon="undo"
            onPress={() => props.setAction(Actions.Reset)}
          />
        ) : (
          <button
            appearance="primary"
            disabled={props.movieLoading || props.actionLoading}
            icon="checkmark"
            onPress={() => {
              props.setAction(Actions.Submit);
              props.showToast(
                `${
                  props.movie.originalName || props.movie.name
                } ~ ${getRatingText(props.rating)} rating`
              );
            }}
          />
        )}
      </hstack>
    </vstack>
  );
};
