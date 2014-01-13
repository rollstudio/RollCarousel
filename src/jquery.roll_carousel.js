(function ($, window, document, undefined) {
    var pluginName = 'rollCarousel';
    var defaults = {
        maxWidth: 1035,
        transition: '1s all linear',
        // mobile first
        defaultGrid: [1, 1],

        initialPage: 1,

        slideSelector: null,

        grid: {
            '500': [2, 1],
            '700': [2, 2]
        },

        margin: 20
    };

    var $window = $(window);

    var $div = $('<div />');
    var $button = $('<button />');

    function Plugin(element, options) {
        this.element = element;
        this.$element = $(element).addClass('roll-carousel');

        var inlineOptions = this.$element.data('roll-carousel-options');

        this.settings = $.extend({}, defaults, inlineOptions, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    Plugin.prototype = {
        init: function () {
            if (this.settings.slideSelector) {
                this.$slides = this.$element.find(this.settings.slideSelector);
            } else {
                this.$slides = this.$element.children();
            }

            this.currentPage = this.settings.initialPage;
            this.numSlides = this.$slides.length;
            this.elementWidth = this.$element.width();

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

            this.$slides.on('transitionend', function() {
                $(this).css('transition', '');
            });

            $window.resize($.proxy(this.resize, this));
        },

        build: function() {
            var grid = this.getGrid();

            this.buildSlides(grid[0], grid[1]);
        },

        getGrid: function() {
            var w = this.elementWidth;

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
            this.elementWidth = this.$element.width();
            this.build();
        },

        setEvents: function() {
            this.$nextButton.on('click', $.proxy(this.next, this));
            this.$prevButton.on('click', $.proxy(this.prev, this));
        },

        getPositionInfo: function(top, left) {
            if (Modernizr.csstransforms3d) {
                return {
                    transform: 'translate3d(' + left + 'px, ' + top + 'px, 0px)'
                };
            } else if (Modernizr.csstransforms) {
                return {
                    transform: 'translate(' + left + 'px, ' + top + 'px)'
                };
            } else {
                return {
                    top: top,
                    left: left
                };
            }
        },

        buildSlides: function (rows, cols) {
            this.$outerWrapper.css('height', '');
            this.$wrapper.css('height', '');

            var self = this;

            var perPage = this.perPage = rows * cols;
            this.pages = Math.ceil(this.numSlides / this.perPage);

            // todo: put this in the options maybe
            var maxWidth = this.settings.maxWidth;

            if (maxWidth <= 0) {
                maxWidth = Infinity;
            }

            var w = this.elementWidth;

            var baseMargin = this.settings.margin;
            var margin = (cols > 1 ) ? baseMargin : 0; // margin between cols

            var totalMargin = (cols - 1) * margin;

            var columnWidth = (Math.min(maxWidth, w) - totalMargin) / cols;

            var marginLeft = 0;

            if (maxWidth < w) {
                marginLeft = (w - maxWidth) / 2;
            }

            var h = 0;
            var currentRow = 0;

            var currentPage = this.currentPage;

            // todo: do not use jQuery, we can make it a bit faster
            this.$slides.each(function(i) {
                var page = Math.floor(i / perPage);

                var $$ = $(this);

                var left = 0;
                var top = 0;

                // suppose same height for all the slides
                if (i === 0) {
                    h = $$.css({
                        'width': columnWidth,
                        'height': ''
                    }).outerHeight();
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

                if (page !== currentPage - 1) {
                    left = baseLeft + w + margin;
                }

                $$.css($.extend({
                    position: 'absolute',
                    width: columnWidth,
                    height: h
                }, self.getPositionInfo(top, left))).data({
                    // todo move this somewhere else
                    baseLeft: baseLeft,
                    baseTop: baseTop
                });
            });

            var totalHeight = h * rows + (rows - 1) * baseMargin;

            this.$outerWrapper.css('height', totalHeight);
            this.$wrapper.css('height', totalHeight);
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

            var self = this;
            var margin = this.settings.margin;

            var currentPage = this.currentPage;
            this.currentPage = page;
            this.setPrevNext();

            var ww = this.elementWidth;//$window.width();

            var transition = this.settings.transition;

            // remove transition so that we animate only when needed
            this.$slides.css('transition', '');

            // current shown elements
            var start = (currentPage - 1) * this.perPage;
            var end = start + this.perPage;

            // reverse animation if going back
            var reverse = currentPage > page;

            var offset = ww + margin;

            if (reverse) {
                offset = -offset;
            }

            var movingOut = this.$slides.slice(start, end).each(function() {
                var $$ = $(this);

                var data = $$.data();

                var left = data.baseLeft - offset;
                var top = data.baseTop;

                $$.css($.extend({
                    'transition': transition,
                }, self.getPositionInfo(top, left)));
            });

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

                $$.css(self.getPositionInfo(top, left + offset));

                // maybe force layout?
                window.setTimeout(function() {
                    $$.css($.extend({
                        'transition': transition,
                    }, self.getPositionInfo(top, left)));
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

    $.fn[pluginName] = function (options) {
        var args = arguments;

        // Is the first parameter an object (options), or was omitted,
        // instantiate a new instance of the plugin.
        if (options === undefined || typeof options === 'object') {
            return this.each(function () {

                // Only allow the plugin to be instantiated once,
                // so we check that the element has no plugin instantiation yet
                if (!$.data(this, 'plugin_' + pluginName)) {

                    // if it has no instance, create a new one,
                    // pass options to our plugin constructor,
                    // and store the plugin instance
                    // in the elements jQuery data object.
                    $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
                }
            });

        // If the first parameter is a string and it doesn't start
        // with an underscore or "contains" the `init`-function,
        // treat this as a call to a public method.
        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

            // Cache the method call
            // to make it possible
            // to return a value
            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                // Tests that there's already a plugin-instance
                // and checks that the requested public method exists
                if (instance instanceof Plugin && typeof instance[options] === 'function') {

                    // Call the method of our plugin instance,
                    // and pass it the supplied arguments.
                    returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
                }

                // Allow instances to be destroyed via the 'destroy' method
                if (options === 'destroy') {
                  $.data(this, 'plugin_' + pluginName, null);
                }
            });

            // If the earlier cached method
            // gives a value back return the value,
            // otherwise return this to preserve chainability.
            return returns !== undefined ? returns : this;
        }
    };

})(jQuery, window, document);
