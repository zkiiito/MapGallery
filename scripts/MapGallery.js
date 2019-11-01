/*global MapAnimator */
"use strict";
const fadeSpeed = 200;

const MapGallery = {
    pos: -1,
    waypoints: [],
    slideHolder: document.getElementById("gallery"),
    imgdir: "images/",
    fullscreen: false,
    watchHashChange: true,

    initialize: function (waypoints, startLocation) {
        var that = this;

        this.waypoints = waypoints;

        document.addEventListener('keydown', (e) => {
            if ((e.key === 'ArrowLeft') || (e.key === 'ArrowDown')) {
                e.preventDefault();
                this.move(-1);
            } else if ((e.key === 'ArrowRight') || (e.key === 'ArrowUp') || (e.code === 'Space')) {
                e.preventDefault();
                this.move(1);
            }
        });

        document.getElementById('btnPrev').addEventListener('click', () => {
            this.move(-1);
        });

        document.getElementById('btnNext').addEventListener('click', () => {
            this.move(1);
        });

        document.getElementById('btnHelper').addEventListener('click', () => {
            this.move(1);
        });

        this.slideHolder.addEventListener("click", () => {
            this.move(1);
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
        this.slideHolder.classList.remove('show');
        this.slideHolder.innerHTML = '';

        const hashPos = parseInt(window.location.hash.substr(1), 10);

        if (!isNaN(hashPos) && this.waypoints[hashPos - 1] !== undefined) {
            this.pos = hashPos - 2;//-1 because of 0.., -1 because we have to move to this.
        } else {
            document.getElementById("btnHelper").style.display = '';
        }

        startLocation = startLocation || this.getFirstLocation();
        //if we come by a hash, and the current step is not a map
        if (hashPos && this.waypoints[this.pos + 1].from === undefined) {
            startLocation = this.getLastLocation() || startLocation;
        }

        this.updateBtns();

        MapAnimator.stopAnimation();
        MapAnimator.showStartLocation(startLocation, this.waypoints[this.pos + 1].from === undefined,  () => {
            this.move(1);
        });
    },

    move: function (dir) {
        document.getElementById("btnHelper").style.display = 'none';
        this.openFullscreen();
        MapAnimator.stopAnimation();

        const currentSlides = this.slideHolder.querySelectorAll(".gallery");

        this.pos += dir;
        const next = this.waypoints[this.pos];

        currentSlides.forEach((currentSlide) => {
            currentSlide.classList.remove('show');

            setTimeout(() => {
                if (currentSlide.parentNode) {
                    currentSlide.parentNode.removeChild(currentSlide);
                }
            }, fadeSpeed);
        });

        if (next) {
            this.preload(this.pos + 1);

            if (next.from !== undefined) {
                this.slideHolder.classList.remove('show');

                setTimeout(() => {
                    MapAnimator.showRoute(next, (err) => {
                        if (err) {
                            console.log(err);
                        }
                        this.move(1);
                    });
                }, fadeSpeed);
            } else {
                const nextSlide = document.createElement('div');
                nextSlide.style.backgroundImage = "url('" + this.getImageUrl(this.pos) + "')";
                nextSlide.classList.add("gallery", "fullscreen");

                this.slideHolder.appendChild(nextSlide);
                this.slideHolder.classList.add('show');
                setTimeout(() => nextSlide.classList.add('show'), 25);
            }
        } else {
            this.pos -= dir;
        }
        this.watchHashChange = false;
        window.location.hash = (this.pos + 1).toString();

        this.updateBtns();
    },

    updateBtns: function () {
        if (this.pos <= 0) {
            document.getElementById('btnPrev').style.display = 'none';
            document.getElementById('btnNext').classList.add("hover");
        } else {
            document.getElementById('btnPrev').style.display = '';
            document.getElementById('btnNext').classList.remove("hover");
        }

        if (this.pos + 1 >= this.waypoints.length) {
            document.getElementById('btnNext').style.display = 'none';
        } else {
            document.getElementById('btnNext').style.display = '';
        }
    },

    preload: function (pos) {
        if (this.waypoints[pos] && this.waypoints[pos].from === undefined) {
            const img = new Image();
            img.src = this.getImageUrl(pos);
        }
    },

    getImageUrl: function (pos) {
        let url = this.waypoints[pos];
        if (url.substr(0, 4) !== "http") {
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
        let startLocation = null;
        this.waypoints.slice(Math.max(this.pos, 0)).some((waypoint) => {
            if (waypoint.from !== undefined) {
                startLocation = waypoint.from;
                return true;
            }
            return false;
        });

        return startLocation;
    },

    getLastLocation: function () {
        let lastLocation = null;
        this.waypoints.slice(0, this.pos + 1).reverse().some((waypoint) => {
            if (waypoint.to !== undefined) {
                lastLocation = waypoint.to;
                return true;
            }
            return false;
        });

        return lastLocation;
    }
};
