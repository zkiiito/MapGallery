/*global MapAnimator, $ */
var MapGallery = {
    pos: 0,
    waypoints: [],
    el: $('#gallery'),
    imgdir: 'images/',
    fullscreen: false,

    initialize: function (waypoints, startLocation) {
        var that = this;

        this.el.hide();

        this.waypoints = waypoints;
        startLocation = startLocation || this.getFirstLocation();

        if (this.waypoints[0].from !== undefined) {
            that.pos = -1;
        }

        $(document).keydown(function (e) {
            if ((e.which === 37) || (e.which === 40)) {
                e.preventDefault();
                that.move(-1);
            } else if ((e.which === 38) || (e.which === 39)) {
                e.preventDefault();
                that.move(1);
            }
        });

        this.el.on("click", function () {
            that.move(1);
        });

        MapAnimator.initialize(startLocation, function () {
            that.move(0);
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
            }
        });
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
        this.waypoints.some(function (waypoint) {
            if (waypoint.from !== undefined) {
                startLocation = waypoint.from;
                return true;
            }
            return false;
        });

        return startLocation;
    }
};
