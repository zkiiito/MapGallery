/*global MapAnimator, $ */
"use strict";
var MapGallery = {
    pos: -1,
    waypoints: [],
    el: $('#gallery'),
    imgdir: 'images/',
    fullscreen: false,
    watchHashChange: true,

    initialize: function (waypoints, startLocation) {
        var that = this;

        this.el.hide();

        this.waypoints = waypoints;

        $(document).keydown(function (e) {
            if ((e.which === 37) || (e.which === 40)) {
                e.preventDefault();
                that.move(-1);
            } else if ((e.which === 38) || (e.which === 39) || (e.which === 32)) {
                e.preventDefault();
                that.move(1);
            }
        });

        $('#btnPrev').click(function () {
            that.move(-1);
        });

        $('#btnNext').click(function () {
            that.move(1);
        });

        this.el.on("click", function () {
            that.move(1);
        });

        MapAnimator.initialize();
        this.initStep(startLocation);

        window.onhashchange = function () {
            if (that.watchHashChange) {
                that.initStep();
            }
            that.watchHashChange = true;
        };
    },

    initStep: function (startLocation) {
        var that = this,
            hashPos;

        this.el.hide();
        this.el.css('background-image', '');

        hashPos = parseInt(window.location.hash.substr(1), 10);

        if (!isNaN(hashPos) && this.waypoints[hashPos - 1] !== undefined) {
            this.pos = hashPos - 2;//-1 because of 0.., -1 because we have to move to this.
        }

        startLocation = startLocation || this.getFirstLocation();
        //if we come by a hash, and the current step is not a map
        if (hashPos && this.waypoints[this.pos + 1].from === undefined) {
            startLocation = this.getLastLocation() || startLocation;
        }

        this.updateBtns();

        MapAnimator.stopAnimation();
        MapAnimator.showStartLocation(startLocation, function () {
            that.move(1);
        });
    },

    move: function (dir) {
        var that = this;
        that.openFullscreen();
        MapAnimator.stopAnimation();
        this.el.fadeOut("fast", function () {
            that.pos += dir;
            var next = that.waypoints[that.pos];

            if (next) {
                that.preload(that.pos + 1);

                if (next.from !== undefined) {
                    MapAnimator.showRoute(next, function () {
                        that.move(1);
                    });
                } else {
                    $(this).css('background-image', 'url("' + that.getImageUrl(that.pos) + '")');
                    $(this).fadeIn("fast");
                }
            } else {
                that.pos -= dir;
            }
            that.watchHashChange = false;
            window.location.hash = (that.pos + 1).toString();

            that.updateBtns();
        });
    },

    updateBtns: function () {
        if (this.pos <= 0) {
            $('#btnPrev').hide();
            $('#btnNext').addClass('hover');
        } else {
            $('#btnPrev').show();
            $('#btnNext').removeClass('hover');
        }

        if (this.pos + 1 >= this.waypoints.length) {
            $('#btnNext').hide();
        } else {
            $('#btnNext').show();
        }
    },

    preload: function (pos) {
        if (this.waypoints[pos] && this.waypoints[pos].from === undefined) {
            var img = new Image();
            img.src = this.getImageUrl(pos);
        }
    },

    getImageUrl: function (pos) {
        var url = this.waypoints[pos];
        if (url.substr(0, 4) !== 'http') {
            url = this.imgdir + url;
        }
        return url;
    },

    openFullscreen: function () {
        if (this.fullscreen) {
            var divObj = document.documentElement;

            if (divObj.requestFullscreen) {
                divObj.requestFullscreen();
            } else if (divObj.msRequestFullscreen) {
                divObj.msRequestFullscreen();
            } else if (divObj.mozRequestFullScreen) {
                divObj.mozRequestFullScreen();
            } else if (divObj.webkitRequestFullscreen) {
                divObj.webkitRequestFullscreen();
            }
        }
    },

    getFirstLocation: function () {
        var startLocation = null;
        this.waypoints.slice(Math.max(this.pos, 0)).some(function (waypoint) {
            if (waypoint.from !== undefined) {
                startLocation = waypoint.from;
                return true;
            }
            return false;
        });

        return startLocation;
    },

    getLastLocation: function () {
        var lastLocation = null;
        this.waypoints.slice(0, this.pos + 1).reverse().some(function (waypoint) {
            if (waypoint.to !== undefined) {
                lastLocation = waypoint.to;
                return true;
            }
            return false;
        });

        return lastLocation;
    }
};
