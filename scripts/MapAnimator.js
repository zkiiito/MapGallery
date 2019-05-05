/*global google */
"use strict";
var MapAnimator = {
    map: null,
    mapdiv: 'map_canvas',
    marker: null,
    polyline: null,
    directionsDisplay: null,
    endLocation: null,
    timerHandle: null,
    defaultStep: 3000,
    step: this.defaultStep,
    tick: 100, // milliseconds
    distance: null,
    callback: null,
    animationTriggerEvent: 'tilesloaded',
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
        var geocoder = new google.maps.Geocoder(),
            that = this;

        geocoder.geocode({'address': address}, function (results) {
            that.map.setCenter(results[0].geometry.location);
            that.marker = that.createMarker(results[0].geometry.location, "start");

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
            zIndex: Math.round(latlng.lat() * -100000) << 5
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

        if (this.directionsDisplay) {
            this.directionsDisplay.setMap(null);
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

        this.directionsDisplay = new google.maps.DirectionsRenderer({map: this.map});

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

    getDirections: function (request, callback) {
        var that = this,
            hash = JSON.stringify(request);

        if (this.directionsCache[hash]) {
            return callback(this.directionsCache[hash], google.maps.DirectionsStatus.OK);
        }

        var directionsService = new google.maps.DirectionsService();
        directionsService.route(request, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                that.directionsCache[hash] = response;
            }

            return callback(response, status);
        });
    },

    getDrivingPath: function (routeParams, callback) {
        var that = this,
            request = {
                origin: routeParams.from,
                destination: routeParams.to,
                travelMode: routeParams.mode || google.maps.DirectionsTravelMode.DRIVING,
                waypoints: routeParams.waypoints || [],
                provideRouteAlternatives: false,
                optimizeWaypoints: false
            };

        // Route the directions and pass the response to a
        // function to create markers for each step.
        this.getDirections(request, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                that.directionsDisplay.setDirections(response);

                var bounds = new google.maps.LatLngBounds(),
                    legs = response.routes[0].legs;

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

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'address': address}, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                that.geocodeCache[hash] = results;
            }

            return callback(results, status);
        });
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
                return function (results, status) {
                    if (status === google.maps.GeocoderStatus.OK) {
                        that.polyline.getPath().setAt(idx, results[0].geometry.location);
                        bounds.extend(results[0].geometry.location);
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
