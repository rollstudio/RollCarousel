(function ($, window, document, undefined) {
    var pluginName = 'rollCarousel';
    var defaults = {
        transition: '1s all linear',
        // mobile first
        defaultGrid: [1, 1],

        grid: {
            '500': [2, 1],
            '700': [2, 2]
        }
    };

    var $window = $(window);

    var $div = $('<div />');
    var $button = $('<button />');

    function Plugin(element, options) {
        this.element = element;
        this.$element = $(element).addClass('roll-carousel');

        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    Plugin.prototype = {
        init: function () {
            this.$slides = this.$element.children();

            this.currentPage = 1;
            this.numSlides = this.$slides.length;

            this.$element.wrapInner($div.clone().addClass('wrapper'));
            this.$element.wrapInner($div.clone().addClass('outer-wrapper'));

            this.$wrapper = this.$element.find('.wrapper');
            this.$outerWrapper = this.$wrapper.parent();
            this.$outerWrapper.css('overflow', 'hidden');

            this.$nextButton = $button.clone().addClass('roll-next').text('next').appendTo(this.$outerWrapper);
            this.$prevButton = $button.clone().addClass('roll-prev').text('prev').appendTo(this.$outerWrapper);

            this.setEvents();

            this.setWrapper();

            this.build();
            this.setPrevNext();
            $window.resize($.proxy(this.resize, this));
        },

        build: function() {
            var grid = this.getGrid();

            this.buildSlides(grid[0], grid[1]);
        },

        getGrid: function() {
            // todo: now everything is based on the window, maybe it's better to base them on the container

            var w = $window.width();

            var sizes = Object.keys(this.settings.grid).sort();

            var size = null;

            for (var i = sizes.length - 1; i >= 0; i--) {
                var tw = sizes[i];

                if (w >= tw) {
                    size = tw;

                    break;
                }
            };

            if (size) {
                return this.settings.grid[size];
            }

            return this.settings.defaultGrid;
        },

        setWrapper: function() {
            this.$wrapper.css({
                'position': 'relative'
            });
        },

        resize: function() {
            // weird things happen when resizing and the current page is not the first
            // todo: fix

            this.build();
        },

        setEvents: function() {
            this.$nextButton.on('click', $.proxy(this.next, this));
            this.$prevButton.on('click', $.proxy(this.prev, this));
        },

        buildSlides: function (rows, cols) {
            var perPage = this.perPage = rows * cols;
            this.pages = Math.ceil(this.numSlides / this.perPage);

            // todo: put this in the options maybe
            var maxWidth = 1035;
            var w = $window.width();

            var baseMargin = 20;
            var margin = (cols > 1 ) ? baseMargin : 0; // margin between cols

            var totalMargin = (cols - 1) * margin;

            var columnWidth = (Math.min(maxWidth, w) - totalMargin) / cols;

            var marginLeft = 0;

            if (maxWidth < w) {
                marginLeft = (w - maxWidth) / 2;
            }

            var h = 0;
            var currentRow = 0;

            // todo: do not use jQuery, we can make it a bit faster
            this.$slides.each(function(i) {
                var page = Math.floor(i / perPage);

                var $$ = $(this);

                var left = 0;
                var top = 0;

                // suppose same height for all the slides
                if (i === 0) {
                    h = $$.css('width', columnWidth).height();
                }

                var currentCol = i % cols;

                var baseLeft = marginLeft + currentCol * (columnWidth + margin);
                var baseTop = currentRow * (h + baseMargin);

                left = baseLeft;
                top = baseTop;

                if (currentCol === cols - 1) {
                    currentRow++;

                    if (currentRow >= rows) {
                        currentRow = 0;
                    }
                }

                if (page > 0) {
                    left = baseLeft + w;
                }

                $$.css({
                    position: 'absolute',
                    width: columnWidth,
                    'transform': 'translate3d(' + left + 'px, ' + top + 'px,0px)'
                }).data({
                    // todo move this somewhere else
                    baseLeft: baseLeft,
                    baseTop: baseTop
                });
            });

            this.$outerWrapper.css('height', (h * rows + baseMargin));
        },

        setPrevNext: function() {
            if (this.currentPage === 1) {
                this.$prevButton.prop('disabled', true);
            } else {
                this.$prevButton.prop('disabled', false);
            }

            if (this.currentPage === this.pages) {
                this.$nextButton.prop('disabled', true);
            } else {
                this.$nextButton.prop('disabled', false);
            }
        },

        goToPage: function(page) {
            // todo: check if page is a valid page

            var currentPage = this.currentPage;
            this.currentPage = page;
            this.setPrevNext();

            var ww = $window.width();

            var transition = this.settings.transition;

            // remove transition so that we animate only when needed
            this.$slides.css('transition', '');

            // current shown elements
            var start = (currentPage - 1) * this.perPage;
            var end = start + this.perPage;

            // reverse animation if going back
            var reverse = currentPage > page;

            var offset = ww;

            if (reverse) {
                offset = -ww;
            }

            var movingOut = this.$slides.slice(start, end).each(function() {
                var $$ = $(this);

                var data = $$.data();

                var left = data.baseLeft - offset;
                var top = data.baseTop;

                $$.css({
                    'transition': transition,
                    'transform': 'translate3d(' + left + 'px, ' + top + 'px,0px)'
                });
            }).first().off('transitionend').on('transitionend', function() {
                // todo: move all to the right ?
            }, false);

            // next elements
            // todo prev animation
            start = (page - 1) * this.perPage;
            end = start + this.perPage;

            console.log(this.$slides.slice(start, end));

            console.log('reverse', reverse);

            this.$slides.slice(start, end).each(function() {
                var $$ = $(this);

                var data = $$.data();

                var left = data.baseLeft;
                var top = data.baseTop;

                $$.css('transform', 'translate3d(' + (left + offset) + 'px, ' + top + 'px,0px)');

                // maybe force layout?
                window.setTimeout(function() {
                    $$.css({
                        'transition': transition,
                        'transform': 'translate3d(' + left + 'px, ' + top + 'px,0px)'
                    });
                });
            });
        },

        next: function() {
            if (this.currentPage === this.pages) {
                return;
            }

            this.goToPage(this.currentPage + 1);
        },

        prev: function() {
            if (this.currentPage === 1) {
                return;
            }

            this.goToPage(this.currentPage - 1);
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);
