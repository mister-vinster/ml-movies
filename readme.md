### movie rating app for reddit 

this app will help you to config one/multiple highlight/normal post template with movie rating feature like letterboxd

[install](https://developers.reddit.com/apps/ml-movies) | [source-code](https://github.com/hedcet/ml-movies)

### features

* preload movie rating from letterboxd/anywhere
* full control over metadata/image
* reddit internal redis as store
* aggregated stats & full export option

### how to install

you can install it any reddit community if you are moderator, this app will add one menu like this

![menu](https://github.com/hedcet/ml-movies/blob/main/assets/menu.png?raw=true)

moderator can add one post with movie rating template like this by using that menu

![movie-rating-template-post](https://github.com/hedcet/ml-movies/blob/main/assets/movie-rating-template-post.png?raw=true)

you can configure this template by using the customize button for following

* moderator for this post
* movie list with image & metadata, also preload rating from letterboxd
* reddit image url mapping

![customize](https://github.com/hedcet/ml-movies/blob/main/assets/customize.png?raw=true)

you can modify it like this

```
{
  "mods": [
    "t2_tnr2e"
  ],
  "movies": [
    {
      "id": "interstellar",
      "image_uri": "https://a.ltrbxd.com/resized/film-poster/1/1/7/6/2/1/117621-interstellar-0-230-0-345-crop.jpg?v=7ad89e6666",
      "title": "Interstellar",
      "secondary_key": "Driector",
      "secondary_value": "Christopher Nolan",
      "half": 5372,
      "one": 13721,
      "one_half": 7007,
      "two": 45415,
      "two_half": 36085,
      "three": 200212,
      "three_half": 198076,
      "four": 707387,
      "four_half": 512993,
      "five": 1851427
    }
  ],
  "refs": {
    "https://a.ltrbxd.com/resized/film-poster/1/1/7/6/2/1/117621-interstellar-0-230-0-345-crop.jpg?v=7ad89e6666": "https://i.redd.it/b87sx5w6dlne1.jpeg"
  }
}
```

your userId be there in `mods` array if you creating the post & you can add multiple userId to make them as moderator to this post

`movies` array accept multiple movie object in which `id` & `title` are mandatory which is useful - one post weekly


| prop | description |
|-|-|
| id | unique id like slug in letterboxd url |
| title | english title of the movie |
| original_title | locale version of title |
| image_uri | image url to upload, aspect ratio ~ 2:3  |
| secondary_key | extra metadata key like release-date |
| secondary_value | extra metadata value |


preload movie rating from letterbox by using `half` to `five` props like [this](https://github.com/hedcet/boxoffice-server/blob/main/ml-movies.json)

this app will automatically ingest external `image_uri` & keep that in `refs` mapping when you submit

this app using [ajv](https://www.npmjs.com/package/ajv) to validate JSON data that you submit

everybody can see the rating-statistics per movie & aggregated out of 5 using the statistics button

![stats](https://github.com/hedcet/ml-movies/blob/main/assets/stats.png?raw=true)

download button allow post moderator to download metadata & combined rating (preload + redis) in csv format

### changelog

* 0.0.292
  * first preview

check [github](https://github.com/hedcet/ml-movies/releases) for beta

### roadmap

| feature | description |
|-|-|
| enable_recent_page | enable recent 6 as home page list/tile |
| banner_url | background image per movie |
| recommend_score + ordering | weighted AI scoring & personalised sorting |
| watchlist | multi-purpose personal list |
