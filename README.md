# MapGallery

I could not find an image viewer which supports slideshows mixing photos with maps, so I created my own. It's designed for local images and flickr sets.

Try it now at http://zkiiito.github.io/MapGallery

## Controls

Next photo: right arrow, down arrow, click

Prev photo: left arrow, up arrow

## Instructions

### Local images

1. Download and unzip the .zip file or clone the repo.
2. Copy your photos to the /images folder
3. Edit scripts/demo.js
4. Edit index.html, add your [google maps key](https://developers.google.com/maps/documentation/javascript/get-api-key). 
5. Access the index.html page.

### Flickr images

See [map-gallery-flickr](https://github.com/zkiiito/map-gallery-flickr)

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

