(function ($, window, document, undefined) {
    var pluginName = 'rollCarousel';
    var defaults = {
        initialPage: 1,
        slideSelector: null,

        controls: true,

        prevText: 'Previous',
        nextText: 'Next',

        pagination: false,
        paginationText: '{i}',
        paginationElement: null,

        // options that can be redeclared in sizes

        maxWidth: 1035,
        transition: '0.5s all linear',
        margin: 20,

        grid: [1, 1],

        sizes: {
            '500': {
                transition: '0.7s all linear',
                grid: [2, 1]
            },
            '700': {
                grid: [2, 2]
            }
        }
    };

    var $window = $(window);

    var $div = $('<div />');
    var $button = $('<button />');

    function Plugin(element, options) {
        this.element = element;
        this.$element = $(element).addClass('roll-carousel');

        var inlineOptions = this.$element.data('roll-carousel-options');

        if (inlineOptions !== undefined && typeof inlineOptions !== 'object') {
            throw new Error('roll-carousel-options should be a valid json.');
        }

        this.settings = $.extend({}, $.fn[pluginName].defaults, inlineOptions, options);
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
            this.isAnimating = false;

            this.$outerWrapper = $div.clone().addClass('outer-wrapper');
            this.$wrapper = $div.clone().addClass('wrapper');

            this.$outerWrapper.append(this.$wrapper);
            this.$element.append(this.$outerWrapper);

            this.$wrapper.append(this.$slides);

            this.$outerWrapper.css('overflow', 'hidden');

            if (this.settings.controls) {
                this.$nextButton = $button.clone().addClass('roll-next').text(this.settings.nextText).appendTo(this.$outerWrapper);
                this.$prevButton = $button.clone().addClass('roll-prev').text(this.settings.prevText).appendTo(this.$outerWrapper);
            }

            this.setWrapper();

            this.currentBreakpoint = this.getBreakpoint();
            this.build();

            var self = this;

            this.$slides.on('transitionend', function() {
                $(this).css('transition', '');

                self.isAnimating = false;
            });

            this.setEvents();

            $window.resize($.proxy(this.resize, this));
        },

        build: function() {
            var grid = this.getOption('grid');

            this.buildSlides(grid[0], grid[1]);
            this.setPrevNext();

            if (this.settings.pagination) {
                this.buildPagination();
            }
        },

        getSizes: function() {
            return Object.keys(this.settings.sizes).sort(function(a, b) { return a - b; });
        },

        getOption: function(name) {
            var bp = +this.currentBreakpoint;

            var sizeSettings = this.settings.sizes;

            var value = this.settings[name];

            if (bp > 0) {
                if (name in sizeSettings[bp]) {
                    value = sizeSettings[bp][name];
                } else {
                    var sizes = this.getSizes();

                    for (var i = sizes.length - 1; i >= 0; i--) {
                        var size = +sizes[i];

                        if (size < bp) {
                            if (name in sizeSettings[size]) {
                                value = sizeSettings[size][name];

                                break;
                            }
                        }
                    };
                }
            }

            return value;
        },

        getBreakpoint: function() {
            var w = this.elementWidth;

            var sizes = this.getSizes();

            var size = null;

            for (var i = sizes.length - 1; i >= 0; i--) {
                var tw = +sizes[i];

                if (w >= tw) {
                    size = tw;

                    break;
                }
            };

            return size;
        },

        setWrapper: function() {
            this.$wrapper.css({
                'position': 'relative'
            });
        },

        resize: function() {
            var oldGrid = this.getOption('grid');

            this.elementWidth = this.$element.width();
            this.currentBreakpoint = this.getBreakpoint();

            this.build();

            var newGrid = this.getOption('grid');

            if (oldGrid !== newGrid) {
                this.$element.trigger('gridChanged', newGrid);
            }
        },

        setEvents: function() {
            if (this.settings.controls) {
                this.$nextButton.on('click', $.proxy(this.next, this));
                this.$prevButton.on('click', $.proxy(this.prev, this));
            }

            if (this.$paginationContainer) {
                this.$paginationContainer.on('click', 'div', $.proxy(function(e) {
                    var index = $(e.target).index();

                    this.goToPage(index + 1);
                }, this));
            }

            if ($.fn.hammer) {
                this.$outerWrapper.hammer()
                    .on('swiperight', $.proxy(this.prev, this))
                    .on('swipeleft', $.proxy(this.next, this));
            }
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

            var maxWidth = this.getOption('maxWidth');

            if (jQuery.type(maxWidth) === 'string') {
                var percentage = parseFloat(maxWidth.replace('%', '')) / 100;

                maxWidth = this.elementWidth * percentage;
            }

            if (maxWidth <= 0) {
                maxWidth = Infinity;
            }

            var w = this.elementWidth;

            var baseMargin = this.getOption('margin');
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

            var slides = this.$slides.toArray();

            for (var i = 0; i < slides.length; i++) {
                var page = Math.floor(i / perPage);

                var $$ = $(slides[i]);

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
            };

            var totalHeight = h * rows + (rows - 1) * baseMargin;

            if (this.pages === 1 && this.numSlides < perPage) {
                var visibleRows = Math.ceil(this.numSlides / cols);

                totalHeight = h * visibleRows + (visibleRows - 1) * baseMargin;
            }

            this.$outerWrapper.css('height', totalHeight);
            this.$wrapper.css('height', totalHeight);
        },

        buildPagination: function() {
            if (!this.$paginationContainer) {
                if (this.settings.paginationElement) {
                    this.$paginationContainer = this.settings.paginationElement;
                } else {
                    this.$paginationContainer = $div.clone().addClass('roll-pagination');

                    this.$paginationContainer.insertAfter(this.$outerWrapper);
                }
            }

            this.$paginationContainer.empty();

            for (var i = 0; i < this.pages; i++) {
                var $d = $div.clone().text(this.settings.paginationText.replace('{i}', i));

                if (i === this.currentPage - 1) {
                    $d.addClass('current');
                }

                this.$paginationContainer.append($d);
            }
        },

        setPrevNext: function() {
            if (!this.settings.controls) {
                return;
            }

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

        goToPage: function(page, disableAnimation) {
            if (this.isAnimating) {
                return;
            }

            var self = this;
            var margin = this.getOption('margin');

            var currentPage = this.currentPage;

            if (currentPage === page || page <= 0 || page > this.pages) {
                return;
            }

            if (this.settings.pagination) {
                this.$paginationContainer.find('.current').removeClass('current');
                this.$paginationContainer.children().eq(page - 1).addClass('current');
            }

            this.currentPage = page;

            this.setPrevNext();

            var ww = this.elementWidth;

            var transition = '';

            if (!disableAnimation && Modernizr.csstransitions) {
                transition = this.getOption('transition');
                this.isAnimating = true;
            }

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

            var movingOut = this.$slides.slice(start, end);

            // next elements
            // todo prev animation
            start = (page - 1) * this.perPage;
            end = start + this.perPage;

            var movingIn = this.$slides.slice(start, end).each(function() {
                var $$ = $(this);

                var data = $$.data();

                var left = data.baseLeft;
                var top = data.baseTop;

                $$.css(self.getPositionInfo(top, left + offset));
            });

            window.setTimeout(function() {
                movingIn.each(function() {
                    var $$ = $(this);

                    var data = $$.data();

                    var left = data.baseLeft;
                    var top = data.baseTop;

                    $$.css($.extend({
                        'transition': transition,
                    }, self.getPositionInfo(top, left)));
                });

                movingOut.each(function() {
                    var $$ = $(this);

                    var data = $$.data();

                    var left = data.baseLeft - offset;
                    var top = data.baseTop;

                    $$.css($.extend({
                        'transition': transition,
                    }, self.getPositionInfo(top, left)));
                });
            });

            this.$element.trigger('beforePageChange', [this.currentPage]);
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

    $.fn[pluginName].defaults = defaults;

})(jQuery, window, document);
