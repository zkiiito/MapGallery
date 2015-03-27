var config = {
    flickrKey: process.env.FLICKR_KEY || 'YOURFLICKRKEY',
    flickrSecret: process.env.FLICKR_SECRET || 'YOURFLICKRSECRET',
    port: process.env.PORT || '8000'
};

module.exports = config;