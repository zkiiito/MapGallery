/*global google, $ */
var MapAnimator = {
    map: null,
    mapdiv: $('#map_canvas')[0],
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

    initialize: function (address, callback) {
        // Create a map and center it on address
        var that = this,
            geocoder = new google.maps.Geocoder(),
            myOptions = {
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

        this.map = new google.maps.Map(this.mapdiv, myOptions);

        geocoder.geocode({'address': address}, function (results) {
            that.map.setCenter(results[0].geometry.location);
            that.marker = that.createMarker(results[0].geometry.location, "start");

            if (callback) {
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

        if (routeParams.mode === undefined || routeParams.mode === google.maps.DirectionsTravelMode.DRIVING) {
            this.getDrivingPath(routeParams, function () {
                that.startAnimation();
            });
        } else {
            this.getFlyingPath(routeParams, function () {
                that.startAnimation();
            });
        }
    },

    getDrivingPath: function (routeParams, callback) {
        var directionsService = new google.maps.DirectionsService(),
            that = this,
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
        directionsService.route(request, function (response, status) {
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
                console.log(status);
            }
        });
    },

    getFlyingPath: function (routeParams, callback) {
        var geocoder = new google.maps.Geocoder(),
            locations = [],
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
            geocoder.geocode({'address': location}, (function (idx) {
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
                        console.log(status);
                    }
                };
            }(idx)));
        });
    },

    startAnimation: function () {
        var that = this;
        this.distance = this.polyline.Distance();
        this.map.setCenter(this.polyline.getPath().getAt(0));

        google.maps.event.addListenerOnce(this.map, 'idle', function () {
            that.animate(that.step);
        });
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
    }
};
