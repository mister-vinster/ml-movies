build with [devvit](https://developers.reddit.com)

### movie rating app for reddit 

this app will help you to config one/multiple highlight/normal post with movie rating feature like letterboxd

### features

* preload movie rating from letterboxd/anywhere
* full control over metadata/image
* reddit redis as store
* full stats & export options

### configs

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

your userId be there in `mods` array if you creating the post & you can add multiple userId to make them as post-mod

`movies` array accept multiple movie object in which `id` & `title` are mandatory


| prop | description |
|-|-|
| id | unique id like slug in letterboxd url |
| title | title of the movie english |
| original_title | locale version of title |
| image_uri | image url to upload, aspect ratio ~ 2:3  |
| secondary_key | extra metadata key like release-date |
| secondary_value | extra metadata value |


preload movie rating from letterbox by using `half` to `five` like [this](https://github.com/hedcet/boxoffice-server/blob/main/ml-movies.json)

this app will upload external `image_uri` & keep that mapping in `refs`

### roadmap

| feature | description |
|-|-|
| banner_url | background image per movie |
| recommend_score + ordering | weighted AI scoring & personalised sorting |
| watchlist | multi-purpose personal list |
