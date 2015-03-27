# MapGallery

I could not find an image viewer which supports slideshows mixing photos with maps, so I created my own. It's designed for local images and flickr sets.

Try it now at http://zoo.li/MapGallery

## Controls

Next photo: right arrow, down arrow, click

Prev photo: left arrow, up arrow

## Instructions

### Local images

1. Download and unzip the .zip file or clone the repo.
2. Copy your photos to the /images folder
3. Edit scripts/demo.js
4. Access the index.html page.

### Flickr images

First, you must add the map directions to the description field of your images on flickr, like this:

```
{"from":"New York JFK","to":"Rome","speed":70000,"mode":"FLYING"}
```


1. Download and unzip the .zip file or clone the repo.
2. npm install
3. set up config.js with your flickr api key
4. npm start
5. open http://localhost:8000/[flickrSetId] in your browser

## Options

from: string, starting position  
to: string, destination  
speed: integer, indicating travel speed  
mode: string, if it equals FLYING, it's a line on the map. otherwise, a driving road is calculated by google.  
waypoints: array, see [here](https://developers.google.com/maps/documentation/javascript/examples/directions-waypoints)


### Stuff used to make this:

 * [geocodezip](http://www.geocodezip.com/) - Map animation is based on a script from there
 * [Moyan Brenn](https://www.flickr.com/photos/aigle_dore/) - Demo photos about Rome
 * [echiner1](https://www.flickr.com/photos/decadence/) - Demo photo about Pisa

