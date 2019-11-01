/*global google */
"use strict";
var MapAnimator = {
    map: null,
    mapdiv: 'map_canvas',
    marker: null,
    polyline: null,
    endLocation: null,
    timerHandle: null,
    defaultStep: 3000,
    step: this.defaultStep,
    tick: 100, // milliseconds
    distance: null,
    callback: null,
    animationTriggerEvent: 'tilesloaded',
    cacheServer: null,
    geocodeCache: {},
    directionsCache: {},

    initialize: function () {
        // Create a map and center it on address
        var myOptions = {
            zoom: 13,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            keyboardShortcuts: false,
            panControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL
            },
            mapTypeControl: false
        };

        this.map = new google.maps.Map(document.getElementById(this.mapdiv), myOptions);
    },

    showStartLocation: function (address, callbackImmediately, callback) {
        var that = this;

        this.geocode(address, function (location) {
            that.map.setCenter(location);
            that.marker = that.createMarker(location, "start");

            if (callbackImmediately) {
                callback();
            } else {
                google.maps.event.addListenerOnce(that.map, 'click', function () {
                    callback();
                });
            }
        });
    },

    createMarker: function (latlng, label) {
        var marker = new google.maps.Marker({
            position: latlng,
            map: this.map,
            title: label,
            zIndex: Math.round(latlng.lat * -100000) << 5
        });
        marker.myname = label;

        return marker;
    },

    showRoute: function (routeParams, callback) {
        var that = this;
        this.callback = callback;
        this.step = routeParams.speed || this.defaultStep;

        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
        if (this.marker) {
            this.marker.setMap(null);
        }

        if (this.polyline) {
            this.polyline.setMap(null);
        }

        this.polyline = new google.maps.Polyline({
            path: [],
            strokeColor: '#FF0000',
            strokeWeight: 3
        });

        google.maps.event.clearListeners(this.map, 'click');

        if (routeParams.mode === "FLYING") {
            this.getFlyingPath(routeParams, function (err) {
                if (err) {
                    return callback(err);
                }
                if (!routeParams.displayOnly) {
                    that.startAnimation();
                }
            });
        } else {
            this.getDrivingPath(routeParams, function (err) {
                if (err) {
                    return callback(err);
                }
                if (!routeParams.displayOnly) {
                    that.startAnimation();
                }
            });
        }
    },

    deserializeDirectionsResult: function(legs) {
        legs.forEach(function (leg) {
            leg.end_location = new google.maps.LatLng(leg.end_location.lat, leg.end_location.lng);
            leg.start_location = new google.maps.LatLng(leg.start_location.lat, leg.start_location.lng);

            leg.steps.forEach(function (step) {
                step.end_location = new google.maps.LatLng(step.end_location.lat, step.end_location.lng);
                step.start_location = new google.maps.LatLng(step.start_location.lat, step.start_location.lng);

                step.path = step.path.map((latlng) => new google.maps.LatLng(latlng.lat, latlng.lng));
            });
        });

        return legs;
    },

    getDirections: function (request, callback) {
        var that = this,
            hash = JSON.stringify(request);

        if (this.directionsCache[hash]) {
            return callback(this.directionsCache[hash], google.maps.DirectionsStatus.OK);
        }

        if (this.cacheServer) {
            var url = this.cacheServer + '/geocode/directions?from=' + request.from + '&to=' + request.to;

            if (request.mode) {
                url += '&mode=' + request.mode;
            }

            if (request.waypoints.length) {
                url += '&waypoints=' + JSON.stringify(request.waypoints.map(waypoint => waypoint.location));
            }

            fetch(url)
                .then((results) => results.json())
                .then((results) => {
                    // TODO: ERROR HANDLING
                    results = this.deserializeDirectionsResult(results);
                    that.geocodeCache[hash] = results;
                    callback(results, google.maps.GeocoderStatus.OK);
                });
        } else {
            var req = {
                origin: request.from,
                destination: request.to,
                travelMode: request.mode || google.maps.DirectionsTravelMode.DRIVING,
                waypoints: request.waypoints || [],
                provideRouteAlternatives: false,
                optimizeWaypoints: false
            };

            var directionsService = new google.maps.DirectionsService();
            directionsService.route(req, function (response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    response = response.routes[0].legs;
                    that.directionsCache[hash] = response;
                }

                return callback(response, status);
            });
        }
    },

    getDrivingPath: function (routeParams, callback) {
        var that = this;

        // Route the directions and pass the response to a
        // function to create markers for each step.
        this.getDirections(routeParams, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                var bounds = new google.maps.LatLngBounds(),
                    legs = response;

                // For each route, display summary information.
                if (legs.length) {
                    that.marker = that.createMarker(legs[0].start_location, "start");

                    that.endLocation = {latlng: legs[legs.length - 1].end_location};

                    legs.forEach(function (leg) {
                        leg.steps.forEach(function (step) {
                            step.path.forEach(function (p) {
                                that.polyline.getPath().push(p);
                                bounds.extend(p);
                            });
                        });
                    });
                }

                that.polyline.setMap(that.map);
                that.map.fitBounds(bounds);
                callback();
            } else {
                callback(status);
            }
        });
    },

    geocode: function (address, callback) {
        var that = this,
            hash = JSON.stringify(address);

        if (this.geocodeCache[hash]) {
            return callback(this.geocodeCache[hash], google.maps.GeocoderStatus.OK);
        }

        if (this.cacheServer) {
            fetch(this.cacheServer + '/geocode/location/' + address)
                .then((results) => results.json())
                .then((results) => {
                    // TODO: ERROR HANDLING
                    results = new google.maps.LatLng(results.lat, results.lng);
                    that.geocodeCache[hash] = results;
                    callback(results, google.maps.GeocoderStatus.OK);
                });
        } else {
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({'address': address}, function (results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    results = results[0].geometry.location;
                    that.geocodeCache[hash] = results;
                }

                return callback(results, status);
            });
        }
    },

    getFlyingPath: function (routeParams, callback) {
        var locations = [],
            waypoints = routeParams.waypoints || [],
            that = this,
            bounds = new google.maps.LatLngBounds(),
            counter = 0;

        locations.push(routeParams.from);
        waypoints.forEach(function (waypoint) {
            locations.push(waypoint.location);
        });
        locations.push(routeParams.to);

        locations.forEach(function (location, idx) {
            that.geocode(location, (function (idx) {
                return function (location, status) {
                    if (status === google.maps.GeocoderStatus.OK) {
                        that.polyline.getPath().setAt(idx, location);
                        bounds.extend(location);
                        counter += 1;

                        if (counter === locations.length) {
                            that.marker = that.createMarker(that.polyline.getPath().getAt(0), "start");
                            that.endLocation = {latlng: that.polyline.getPath().getAt(counter - 1)};

                            that.polyline.setMap(that.map);
                            that.map.fitBounds(bounds);
                            callback();
                        }
                    } else {
                        callback(status);
                    }
                };
            }(idx)));
        });
    },

    startAnimation: function () {
        var that = this;
        this.distance = this.polyline.Distance();

        google.maps.event.addListenerOnce(this.map, this.animationTriggerEvent, function () {
            google.maps.event.clearListeners(that.map, 'click');
            if (that.timerHandle === null) {
                that.animate(that.step);
            }
        });

        // if the animation does not trigger, because it has already loaded,
        // at least start on click. it could start on timeout, but we do not
        // know if tiles are loading or not.
        google.maps.event.addListenerOnce(this.map, 'click', function () {
            google.maps.event.clearListeners(that.map, that.animationTriggerEvent);
            if (that.timerHandle === null) {
                that.animate(that.step);
            }
        });

        this.map.setCenter(this.polyline.getPath().getAt(0));
    },

    animate: function (d) {
        var that = this,
            p;

        if (d > this.distance) {
            this.map.panTo(this.endLocation.latlng);
            this.marker.setPosition(this.endLocation.latlng);

            if (that.callback) {
                google.maps.event.addListenerOnce(this.map, 'click', function () {
                    that.callback();
                });
            }
            return;
        }

        p = this.polyline.GetPointAtDistance(d);

        this.map.panTo(p);
        this.marker.setPosition(p);
        this.timerHandle = setTimeout(
            function () {
                that.animate(d + that.step);
            },
            this.tick
        );
    },

    stopAnimation: function () {
        if (this.timerHandle) {
            google.maps.event.clearListeners(this.map, this.animationTriggerEvent);
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
            this.map.panTo(this.endLocation.latlng);
            this.marker.setPosition(this.endLocation.latlng);
        }
    }
};
