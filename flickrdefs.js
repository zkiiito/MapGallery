var Flickr = require('flickrapi'),
    config = require('./config'),
    flickrOptions = {
        api_key: config.flickrKey,
        secret: config.flickrSecret
    };

Flickr.tokenOnly(flickrOptions, function (err) {
    if (err) {
        console.log(err);
        return;
    }

    console.log('Flickr Definitions ready');
});