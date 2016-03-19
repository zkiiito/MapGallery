var Flickr = require('flickrapi'),
    config = require('./config');

Flickr.tokenOnly(config.flickrOptions, function (err) {
    if (err) {
        console.log(err);
        return;
    }

    console.log('Flickr Definitions ready');
});