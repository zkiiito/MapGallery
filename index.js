var express = require('express'),
    Flickr = require('flickrapi'),
    fs = require('fs'),
    config = require('./config'),
    flickrOptions = {
        api_key: config.flickrKey,
        secret: config.flickrSecret
    };

Flickr.tokenOnly(flickrOptions, function (err, flickr) {
    if (err) {
        console.log(err);
        return;
    }

    var app = express();

    app.disable('x-powered-by');
    flickr.proxy(app, '/service/rest');

    app.use('/css', express.static(__dirname + '/css'));
    app.use('/scripts', express.static(__dirname + '/scripts'));
    app.use('/images', express.static(__dirname + '/images'));

    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/index.html');
    });

    app.get('/:setId([0-9]+)', function (req, res) {
        getTitle(flickr, req.params.setId, function (err, title) {
            if (err) {
                console.log(err);
                return;
            }
            fs.readFile(__dirname + '/index.html', {encoding: 'utf-8'}, function (err, data) {
                if (!err) {
                    var clientIndexHtml = data.replace('scripts/demo.js', '/data/' + req.params.setId);
                    clientIndexHtml = clientIndexHtml.replace(/<title>(.*)<\/title>/, '<title>MapGallery - ' + title + '</title>');
                    res.send(clientIndexHtml);
                }
            });
        });
    });

    app.get('/data/:setId([0-9]+)', function (req, res) {
        getAllPhotos(flickr, req.params.setId, 1, [], function (err, allPhotos) {
            if (err) {
                console.log(err);
                return;
            }
            transformPhotos(allPhotos, function (err, transformedPhotos) {
                res.send('MapGallery.initialize(' + JSON.stringify(transformedPhotos) + ');');
            });
        });
    });

    app.listen(config.port, function () {
        console.log('MapGallery listening at ' + config.port);
    });

});

function getTitle(filckr, setId, callback) {
    filckr.photosets.getInfo({
        photoset_id: setId
    }, function (err, data) {
        if (err) {
            if (err.toString().indexOf('user_id') < 0) {
                return callback(err);
            }
            return;
        }

        callback(null, data.photoset.title._content);
    });
}

function getAllPhotos(flickr, setId, page, allPhotos, callback) {
    page = page || 1;
    allPhotos = allPhotos || [];
    flickr.photosets.getPhotos({
        photoset_id: setId,
        extras: 'url_l, description',
        page: page
    }, function (err, data) {
        if (err) {
            if (err.toString().indexOf('user_id') < 0) {
                return callback(err);
            }
            return;
        }

        allPhotos = allPhotos.concat(data.photoset.photo);

        if (data.photoset.pages > page) {
            getAllPhotos(flickr, setId, page + 1, allPhotos, callback);
        } else {
            callback(null, allPhotos);
        }
    });
}

function transformPhotos(photos, callback) {
    var res = [];

    photos.forEach(function (photo) {
        if (photo.description._content !== '') {
            try {
                //needs improvement
                var desc = JSON.parse(photo.description._content.replace(/'/g, '"').replace(/&quot;/g, '"').replace(/\n/g, ''));
                if (Array.isArray(desc)) {
                    res = res.concat(desc);
                } else {
                    res.push(desc);
                }
            } catch (err) {
                console.log(err, photo.description._content);
            }
        }
        res.push(photo.url_l);
    });

    callback(null, res);
}

