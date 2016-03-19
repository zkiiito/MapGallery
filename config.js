var config = {
    flickrOptions: {
        api_key: process.env.FLICKR_KEY || 'YOURFLICKRKEY',
        secret: process.env.FLICKR_SECRET || 'YOURFLICKRSECRET',
        user_id: process.env.FLICKR_USER_ID,
        access_token: process.env.FLICKR_ACCESS_TOKEN,
        access_token_secret: process.env.FLICKR_ACCESS_TOKEN_SECRET
    },
    authenticate: process.env.FLICKR_USER_ID !== undefined,
    port: process.env.PORT || 8000
};

module.exports = config;