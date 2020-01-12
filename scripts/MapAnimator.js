// eslint-disable-next-line no-unused-vars
const MapAnimator = {
    map: null,
    mapdiv: 'map_canvas',
    marker: null,
    polyline: null,
    allPolylines: [],
    endLocation: null,
    timerHandle: null,
    defaultStep: 1200,
    step: this.defaultStep,
    tick: 40, // milliseconds
    distance: null,
    callback: null,
    animationTriggerEvent: 'tilesloaded',
    cacheServer: null,
    geocodeCache: {},
    directionsCache: {},

    initialize() {
        // Create a map and center it on address
        const myOptions = {
            zoom: 13,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            keyboardShortcuts: false,
            panControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL,
            },
            mapTypeControl: false,
        };

        this.map = new google.maps.Map(document.getElementById(this.mapdiv), myOptions);
    },

    showStartLocation(address, callbackImmediately, callback) {
        this.geocode(address, (location) => {
            this.map.setCenter(location);
            this.marker = this.createMarker(location, 'start');

            if (callbackImmediately) {
                callback();
            } else {
                google.maps.event.addListenerOnce(this.map, 'click', () => {
                    callback();
                });
            }
        });
    },

    createMarker(latlng, label) {
        const marker = new google.maps.Marker({
            position: latlng,
            map: this.map,
            title: label,
            zIndex: Math.round(latlng.lat * -100000) * 32,
        });
        marker.myname = label;

        return marker;
    },

    showRoute(routeParams, callback) {
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

        google.maps.event.clearListeners(this.map, 'click');

        this.getPath(routeParams, (err, path) => {
            if (err) {
                callback(err);
                return;
            }

            this.polyline = new google.maps.Polyline({
                path,
                strokeColor: '#FF0000',
                strokeWeight: 3,
                zIndex: 100,
            });
            this.polyline.setMap(this.map);
            this.marker = this.createMarker(path[0], 'start');
            this.endLocation = { latlng: path[path.length - 1] };
            this.fitMapToPolylines([this.polyline]);

            if (!routeParams.displayOnly) {
                this.startAnimation();
            } else {
                callback(null);
            }
        });
    },

    getPath(routeParams, callback) {
        const method = routeParams.mode === 'FLYING' ? 'getFlyingPath' : 'getDrivingPath';
        this[method](routeParams, callback);
    },

    deserializeDirectionsResult(legs) {
        /* eslint-disable no-param-reassign */
        legs.forEach((leg) => {
            leg.end_location = new google.maps.LatLng(leg.end_location.lat, leg.end_location.lng);
            leg.start_location = new google.maps.LatLng(leg.start_location.lat, leg.start_location.lng);

            leg.steps.forEach((step) => {
                step.end_location = new google.maps.LatLng(step.end_location.lat, step.end_location.lng);
                step.start_location = new google.maps.LatLng(step.start_location.lat, step.start_location.lng);

                step.path = step.path.map((latlng) => new google.maps.LatLng(latlng.lat, latlng.lng));
            });
        });
        /* eslint-enable no-param-reassign */

        return legs;
    },

    getDirections(request, callback) {
        const hash = JSON.stringify(request);

        if (this.directionsCache[hash]) {
            callback(this.directionsCache[hash], google.maps.DirectionsStatus.OK);
            return;
        }

        if (this.cacheServer) {
            let url = `${this.cacheServer}/geocode/directions?from=${request.from}&to=${request.to}`;

            if (request.mode) {
                url += `&mode=${request.mode}`;
            }

            if (request.waypoints && request.waypoints.length > 0) {
                url += `&waypoints=${JSON.stringify(request.waypoints.map((waypoint) => waypoint.location))}`;
            }

            fetch(url)
                .then((results) => results.json())
                .then((results) => {
                    if (results.status) {
                        return callback(null, results.status);
                    }
                    if (results.error) {
                        return callback(null, results.error);
                    }
                    const deserializedResults = this.deserializeDirectionsResult(results);
                    this.directionsCache[hash] = deserializedResults;
                    return callback(deserializedResults, google.maps.GeocoderStatus.OK);
                });
        } else {
            const req = {
                origin: request.from,
                destination: request.to,
                travelMode: request.mode || google.maps.DirectionsTravelMode.DRIVING,
                waypoints: request.waypoints || [],
                provideRouteAlternatives: false,
                optimizeWaypoints: false,
            };

            const directionsService = new google.maps.DirectionsService();
            directionsService.route(req, (response, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    const result = response.routes[0].legs;
                    this.directionsCache[hash] = result;
                    return callback(result, status);
                }

                return callback(response, status);
            });
        }
    },

    getDrivingPath(routeParams, callback) {
        // Route the directions and pass the response to a
        // function to create markers for each step.
        this.getDirections(routeParams, (response, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                const legs = response;
                const path = [];

                // For each route, display summary information.
                if (legs.length) {
                    legs.forEach((leg) => {
                        leg.steps.forEach((step) => {
                            step.path.forEach((p) => {
                                path.push(p);
                            });
                        });
                    });
                }

                callback(null, path);
            } else {
                callback(status);
            }
        });
    },

    geocode(address, callback) {
        const hash = JSON.stringify(address);

        if (this.geocodeCache[hash]) {
            callback(this.geocodeCache[hash], google.maps.GeocoderStatus.OK);
            return;
        }

        if (this.cacheServer) {
            fetch(`${this.cacheServer}/geocode/location/${address}`)
                .then((results) => results.json())
                .then((results) => {
                    if (results.status) {
                        callback(null, results.status);
                        return;
                    }
                    if (results.error) {
                        callback(null, results.error);
                        return;
                    }
                    const resultsLatLng = new google.maps.LatLng(results.lat, results.lng);
                    this.geocodeCache[hash] = resultsLatLng;
                    callback(resultsLatLng, google.maps.GeocoderStatus.OK);
                });
        } else {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK) {
                    const resultsLatLng = results[0].geometry.location;
                    this.geocodeCache[hash] = resultsLatLng;
                    return callback(resultsLatLng, status);
                }

                return callback(results, status);
            });
        }
    },

    getFlyingPath(routeParams, callback) {
        const locations = [];
        const waypoints = routeParams.waypoints || [];
        const path = [];
        let counter = 0;

        locations.push(routeParams.from);
        waypoints.forEach((waypoint) => {
            locations.push(waypoint.location);
        });
        locations.push(routeParams.to);

        locations.forEach((location, idx) => {
            this.geocode(location, (latlng, status) => {
                if (status === google.maps.GeocoderStatus.OK) {
                    path[idx] = latlng;
                    counter += 1;

                    if (counter === locations.length) {
                        callback(null, path);
                    }
                } else {
                    callback(status);
                }
            });
        });
    },

    startAnimation() {
        this.distance = this.polyline.Distance();

        google.maps.event.addListenerOnce(this.map, this.animationTriggerEvent, () => {
            google.maps.event.clearListeners(this.map, 'click');
            if (this.timerHandle === null) {
                this.animate(this.step);
            }
        });

        // if the animation does not trigger, because it has already loaded,
        // at least start on click. it could start on timeout, but we do not
        // know if tiles are loading or not.
        google.maps.event.addListenerOnce(this.map, 'click', () => {
            google.maps.event.clearListeners(this.map, this.animationTriggerEvent);
            if (this.timerHandle === null) {
                this.animate(this.step);
            }
        });

        this.map.setCenter(this.polyline.getPath().getAt(0));
    },

    animate(d) {
        if (d > this.distance) {
            this.map.panTo(this.endLocation.latlng);
            this.marker.setPosition(this.endLocation.latlng);

            if (this.callback) {
                google.maps.event.addListenerOnce(this.map, 'click', () => {
                    this.callback();
                });
            }
            return;
        }

        const p = this.polyline.GetPointAtDistance(d);

        this.map.panTo(p);
        this.marker.setPosition(p);
        this.timerHandle = setTimeout(
            () => {
                this.animate(d + this.step);
            },
            this.tick,
        );
    },

    stopAnimation() {
        if (this.timerHandle) {
            google.maps.event.clearListeners(this.map, this.animationTriggerEvent);
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
            this.map.panTo(this.endLocation.latlng);
            this.marker.setPosition(this.endLocation.latlng);
        }
    },

    fitMapToPolylines(polylines) {
        const bounds = new google.maps.LatLngBounds();
        polylines.forEach((polyline) => {
            polyline.getPath().forEach((latlng) => {
                bounds.extend(latlng);
            });
        });

        this.map.fitBounds(bounds);
    },

    showAllRoutes(routes, fit, callback) {
        this.allPolylines.forEach((polyline) => {
            polyline.setMap(null);
        });
        this.allPolylines = [];
        let counter = 0;

        routes.forEach((route, idx) => {
            this.getPath(route, (err, path) => {
                if (path) {
                    const polyline = new google.maps.Polyline({
                        path,
                        strokeColor: '#0000FF',
                        strokeWeight: 2,
                    });

                    polyline.setMap(this.map);
                    this.allPolylines[idx] = polyline;
                }

                counter += 1;
                if (counter === routes.length) {
                    if (fit !== false) {
                        this.fitMapToPolylines(this.allPolylines);
                    }
                    if (callback) {
                        callback();
                    }
                }
            });
        });
    },
};
