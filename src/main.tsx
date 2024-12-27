import { Devvit, useAsync, useState } from "@devvit/public-api";

import { ltrbxd } from "./fixture.js";

type TStore = {
  userId: string;
  rating: number;
  ratingFrozen: boolean | number;
};

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "add ml-movies post",
  location: "subreddit",
  onPress: async (_event, ctx) => {
    const { reddit, ui } = ctx;
    ui.showToast("submitting & navigating");

    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: "ml-movies post",
      subredditName: subreddit.name,
      preview: (
        <vstack grow alignment="middle center">
          <text size="large">loading...</text>
        </vstack>
      ),
    });
    ui.navigateTo(post);
  },
});

Devvit.addCustomPostType({
  height: "tall",
  name: "ml-movies post",
  render: (ctx) => {
    let cache: { [k: string]: TStore } = {};
    async function getRedisStore(k: string) {
      if (!cache[k]) {
        const [store = { userId: ctx.userId!, rating: 5, ratingFrozen: 0 }] = (
          (await ctx.redis.get(k)) || ""
        )
          .split("%")
          .filter((i) => i.startsWith(`${ctx.userId}|`))
          .map((i) => {
            const [userId, rating, ratingFrozen] = i.split("|");
            return { userId, rating: +rating, ratingFrozen: +ratingFrozen };
          });
        cache[k] = store;
      }
      return cache[k];
    }

    let timeout: number | undefined;
    function setRedisStore(k: string, v: TStore) {
      cache[k] = v;
      if (!timeout)
        timeout = setTimeout(async () => {
          const store = (await ctx.redis.get(k)) || "";
          await ctx.redis.set(
            k,
            store.includes(`${cache[k].userId}|`)
              ? store
                  .split("%")
                  .map((i) =>
                    i.startsWith(`${cache[k].userId}|`)
                      ? `${cache[k].userId}|${cache[k].rating}|${+cache[k]
                          .ratingFrozen}`
                      : i
                  )
                  .join("%")
              : `${store ? "%" : ""}${cache[k].userId}|${
                  cache[k].rating
                }|${+cache[k].ratingFrozen}`
          );
          timeout = undefined;
        }, 1000);
      return cache[k];
    }

    function getMovie(index: number = 0) {
      return ltrbxd[index % ltrbxd.length] as any;
    }

    function getRatingText(rating: number) {
      return rating
        ? `${[...Array(Math.floor(rating / 2))].map(() => "★").join("")}${[
            ...Array(Math.floor(rating % 2)),
          ]
            .map(() => "⯨")
            .join("")}`
        : "zero";
    }

    function getRedisStoreKey() {
      return `${ctx.postId}|${movie.letterboxd_slug}`;
    }

    const [movie, setMovie] = useState(getMovie());
    const [movieIndex, setMovieIndex] = useState(0);
    const [store, setStore] = useState<TStore>(
      async () => await getRedisStore(getRedisStoreKey())
    );

    const { loading: storeLoading } = useAsync(
      async () => await getRedisStore(getRedisStoreKey()),
      {
        depends: [movie],
        finally: (store, error) => {
          if (!error) setStore(store!);
        },
      }
    );

    const { loading: movieLoading } = useAsync(
      async () => getMovie(movieIndex),
      {
        depends: [movieIndex],
        finally: (movie, error) => {
          if (!error) setMovie(movie);
        },
      }
    );

    return (
      <vstack alignment="middle center" gap="medium" grow padding="medium">
        <hstack alignment="middle center" gap="small" width="100%">
          {movieIndex ? (
            <button
              icon="back"
              disabled={movieLoading || storeLoading}
              onPress={() => setMovieIndex(movieIndex - 1)}
            />
          ) : (
            ""
          )}
          <spacer grow />
          <button
            icon="forward"
            disabled={movieLoading || storeLoading}
            onPress={() => setMovieIndex(movieIndex + 1)}
          />
        </hstack>

        <spacer grow />

        <hstack alignment="middle center" gap="small">
          <image
            height="192px"
            imageHeight={192}
            imageWidth={128}
            resizeMode="cover"
            url={`ltrbxd/${movie.letterboxd_slug}.jpg`}
            width="128px"
          />

          <vstack grow>
            <text size="xsmall">Movie</text>
            <text
              maxWidth="100%"
              overflow="ellipsis"
              size="xlarge"
              weight="bold"
            >
              {movie?.name || ""}
            </text>
            <text maxWidth="100%" overflow="ellipsis" size="small">
              {movie?.originalName || ""}
            </text>
            <spacer size="medium" />
            <text size="xsmall">Driected By</text>
            <text size="small" weight="bold" wrap>
              {Object.values(movie?.director || {}).join(" | ")}
            </text>
            <spacer size="medium" />
            <text size="xsmall">Release Date</text>
            <text size="small" weight="bold">
              {movie?.releaseDate || ""}
            </text>
          </vstack>
        </hstack>

        {store.ratingFrozen ? (
          <text size="small" weight="bold">
            {getRatingText(store.rating)} rating
          </text>
        ) : (
          <hstack alignment="bottom center" gap="small" width="100%">
            {0 < store.rating ? (
              <button
                icon="subtract"
                onPress={() =>
                  setStore(
                    setRedisStore(getRedisStoreKey(), {
                      ...store,
                      rating: store.rating - 1,
                    })
                  )
                }
              />
            ) : (
              ""
            )}
            <vstack alignment="middle center" maxWidth="60%">
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
                backgroundColor="Orangered-100"
                cornerRadius="full"
                width="60%"
              >
                <hstack
                  backgroundColor="Orangered-500"
                  width={`${store.rating * 10}%`}
                >
                  <spacer size="xsmall" shape="square" />
                </hstack>
              </vstack>
              <text size="xsmall" weight="bold">
                {getRatingText(store.rating)}
              </text>
            </vstack>
            {store.rating < 10 ? (
              <button
                icon="add"
                onPress={() =>
                  setStore(
                    setRedisStore(getRedisStoreKey(), {
                      ...store,
                      rating: store.rating + 1,
                    })
                  )
                }
              />
            ) : (
              ""
            )}
          </hstack>
        )}

        <spacer grow />

        <hstack alignment="middle center" gap="small" width="100%">
          <button icon="statistics" />
          <spacer grow />
          {store.ratingFrozen ? (
            <button
              appearance="destructive"
              disabled={movieLoading || storeLoading}
              icon="undo"
              onPress={() =>
                setStore(
                  setRedisStore(getRedisStoreKey(), {
                    ...store,
                    ratingFrozen: 0,
                  })
                )
              }
            />
          ) : (
            <button
              appearance="primary"
              disabled={movieLoading || storeLoading}
              icon="checkmark"
              onPress={() => {
                setStore(
                  setRedisStore(getRedisStoreKey(), {
                    ...store,
                    ratingFrozen: 1,
                  })
                );
                ctx.ui.showToast(
                  `${movie.originalName || movie.name} ~ ${getRatingText(
                    store.rating
                  )} rating`
                );
              }}
            />
          )}
        </hstack>
      </vstack>
    );
  },
});

export default Devvit;
