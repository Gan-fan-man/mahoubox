/*!
 * Mahoubox v2.11.5
 * by Lokesh Dhakar
 *
 * More info:
 * http://lokeshdhakar.com/projects/mahoubox2/
 *
 * Copyright Lokesh Dhakar
 * Released under the MIT license
 * https://github.com/lokesh/mahoubox2/blob/master/LICENSE
 *
 * @preserve
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else {
        root.mahoubox = factory(root.jQuery);
    }
}(this, function ($) {

  function Mahoubox(options) {
    this.album = [];
    this.currentImageIndex = void 0;
    
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.init();

    this.options = $.extend({}, this.constructor.defaults);
    this.option(options);
  }

  Mahoubox.defaults = {
    albumLabel: 'Image %1 of %2',
    alwaysShowNavOnTouchDevices: false,
    fadeDuration: 600,
    fitImagesInViewport: true,
    imageFadeDuration: 600,
    positionFromTop: 50,
    resizeDuration: 700,
    showImageNumberLabel: true,
    wrapAround: false,
    disableScrolling: true,
    sanitizeTitle: false
  };

  Mahoubox.prototype.option = function(options) {
    $.extend(this.options, options);
  };

  Mahoubox.prototype.imageCountLabel = function(currentImageNum, totalImages) {
    return this.options.albumLabel.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
  };

  Mahoubox.prototype.init = function() {
    var self = this;
    $(document).ready(function() {
      self.enable();
      self.build();
    });
  };

  Mahoubox.prototype.enable = function() {
    var self = this;
    $('body').on('click', 'a[rel^=mahoubox], area[rel^=mahoubox], a[data-mahoubox], area[data-mahoubox]', function(event) {
      self.start($(event.currentTarget));
      return false;
    });
  };

  Mahoubox.prototype.build = function() {
    if ($('#mahoubox').length > 0) {
        return;
    }
    
    // 新增：注入 CSS 以隐藏滚动条
    $('<style type="text/css">.lb-disable-scrolling { overflow: hidden; }</style>').appendTo('head');

    var self = this;
    $('<div id="mahoubox" tabindex="-1" class="mahoubox"><div class="lb-outerContainer"><div class="lb-container"><img class="lb-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" alt=""/><div class="lb-nav"><a class="lb-prev" role="button" tabindex="0" aria-label="Previous image" href="" ></a><a class="lb-next" role="button" tabindex="0" aria-label="Next image" href="" ></a></div><div class="lb-loader"><a class="lb-cancel" role="button" tabindex="0"></a></div></div></div><div class="lb-dataContainer"><div class="lb-data"><div class="lb-details"><span class="lb-caption"></span><span class="lb-number"></span></div><div class="lb-closeContainer"><a class="lb-close" role="button" tabindex="0"></a></div></div></div></div>').appendTo($('body'));


    this.$mahoubox       = $('#mahoubox');
    this.$outerContainer = this.$mahoubox.find('.lb-outerContainer');
    this.$container      = this.$mahoubox.find('.lb-container');
    this.$image          = this.$mahoubox.find('.lb-image');
    this.$nav            = this.$mahoubox.find('.lb-nav');
    this.$dataContainer = this.$mahoubox.find('.lb-dataContainer');


    this.containerPadding = {
      top: parseInt(this.$container.css('padding-top'), 10),
      right: parseInt(this.$container.css('padding-right'), 10),
      bottom: parseInt(this.$container.css('padding-bottom'), 10),
      left: parseInt(this.$container.css('padding-left'), 10)
    };

    this.imageBorderWidth = {
      top: parseInt(this.$image.css('border-top-width'), 10),
      right: parseInt(this.$image.css('border-right-width'), 10),
      bottom: parseInt(this.$image.css('border-bottom-width'), 10),
      left: parseInt(this.$image.css('border-left-width'), 10)
    };

    this.$mahoubox.hide().on('click', function(event) {
      if ($(event.target).attr('id') === 'mahoubox') {
        return false;
      }
    });

    this.$outerContainer.on('click', function(event) {
        if ($(event.target).hasClass('lb-outerContainer')) {
            self.end();
        }
        return false;
    });

    this.$dataContainer.on('click', function(event) {
        event.stopPropagation();
    });


    this.$mahoubox.find('.lb-prev').on('click', function() {
      if (self.currentImageIndex === 0) {
        self.changeImage(self.album.length - 1);
      } else {
        self.changeImage(self.currentImageIndex - 1);
      }
      return false;
    });

    this.$mahoubox.find('.lb-next').on('click', function() {
      if (self.currentImageIndex === self.album.length - 1) {
        self.changeImage(0);
      } else {
        self.changeImage(self.currentImageIndex + 1);
      }
      return false;
    });

    this.$nav.on('mousedown', function(event) {
      if (event.which === 3) {
        self.$nav.css('pointer-events', 'none');
        self.$mahoubox.one('contextmenu', function() {
          setTimeout(function() {
              this.$nav.css('pointer-events', 'auto');
          }.bind(self), 0);
        });
      }
    });

    this.$mahoubox.find('.lb-loader, .lb-close').on('click keyup', function(e) {
      if (
        e.type === 'click' || (e.type === 'keyup' && (e.which === 13 || e.which === 32))) {
        self.end();
        return false;
      }
    });
  };

  Mahoubox.prototype.start = function($link) {
    var self    = this;
    var $window = $(window);

    this.album = [];
    var imageNumber = 0;

    function addToAlbum($link) {
      self.album.push({
        alt: $link.attr('data-alt'),
        link: $link.attr('href'),
        title: $link.attr('data-title') || $link.attr('title')
      });
    }

    var dataMahouboxValue = $link.attr('data-mahoubox');
    var $links;

    if (dataMahouboxValue) {
      $links = $($link.prop('tagName') + '[data-mahoubox="' + dataMahouboxValue + '"]');
      for (var i = 0; i < $links.length; i = ++i) {
        addToAlbum($($links[i]));
        if ($links[i] === $link[0]) {
          imageNumber = i;
        }
      }
    } else {
      if ($link.attr('rel') === 'mahoubox') {
        addToAlbum($link);
      } else {
        $links = $($link.prop('tagName') + '[rel="' + $link.attr('rel') + '"]');
        for (var j = 0; j < $links.length; j = ++j) {
          addToAlbum($($links[j]));
          if ($links[j] === $link[0]) {
            imageNumber = j;
          }
        }
      }
    }

    this.$mahoubox.css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    }).fadeIn(this.options.fadeDuration);

    if (this.options.disableScrolling) {
      $('body').addClass('lb-disable-scrolling');
    }

    this.changeImage(imageNumber);
  };

  Mahoubox.prototype.changeImage = function(imageNumber) {
    var self = this;
    var filename = this.album[imageNumber].link;
    var filetype = filename.split('.').slice(-1)[0];
    var $image = this.$mahoubox.find('.lb-image');

    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.removeInteractionHandlers();
    $image.css({
        'transform': 'scale(1) translate(0px, 0px)',
        'transition': 'none'
    });

    this.disableKeyboardNav();
    this.$outerContainer.fadeIn(this.options.fadeDuration); 

    $('.lb-loader').fadeIn('slow');
    this.$mahoubox.find('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-dataContainer, .lb-numbers, .lb-caption').hide(); 
    this.$outerContainer.addClass('animating');

    var preloader = new Image();
    preloader.onload = function() {
      var imageHeight;
      var imageWidth;
      var maxImageHeight;
      var maxImageWidth;
      var windowHeight;
      var windowWidth;

      $image.attr({
        'alt': self.album[imageNumber].alt,
        'src': filename
      });

      var originalImageWidth = preloader.width;
      var originalImageHeight = preloader.height;

      windowWidth = $(window).width();
      windowHeight = $(window).height();
      
      var dataContainerHeight = self.$mahoubox.find('.lb-dataContainer').outerHeight(true) || 0;
      var horizontalPadding = self.containerPadding.left + self.containerPadding.right + self.imageBorderWidth.left + self.imageBorderWidth.right + 40;
      var verticalPadding = self.containerPadding.top + self.containerPadding.bottom + self.imageBorderWidth.top + self.imageBorderWidth.bottom + dataContainerHeight + 40;

      maxImageWidth  = windowWidth - horizontalPadding;
      maxImageHeight = windowHeight - verticalPadding;

      if (filetype === 'svg') {
        if (originalImageWidth / originalImageHeight >= 1) {
          imageWidth = maxImageWidth;
          imageHeight = parseInt(maxImageWidth / (originalImageWidth / originalImageHeight), 10);
        } else {
          imageHeight = maxImageHeight;
          imageWidth = parseInt(maxImageHeight * (originalImageHeight / originalImageWidth), 10); 
        }
        if (imageHeight > maxImageHeight) {
          imageHeight = maxImageHeight;
          imageWidth = parseInt(maxImageHeight * (originalImageWidth / originalImageHeight), 10);
        }
        if (imageWidth > maxImageWidth) {
          imageWidth = maxImageWidth;
          imageHeight = parseInt(maxImageWidth / (originalImageWidth / originalImageHeight), 10);
        }
        $image.width(imageWidth);
        $image.height(imageHeight);

      } else {
        if (self.options.fitImagesInViewport) {
          if ((originalImageWidth > maxImageWidth) || (originalImageHeight > maxImageHeight)) {
            if ((originalImageWidth / maxImageWidth) > (originalImageHeight / maxImageHeight)) {
              imageWidth  = maxImageWidth;
              imageHeight = parseInt(originalImageHeight / (originalImageWidth / imageWidth), 10);
            } else {
              imageHeight = maxImageHeight;
              imageWidth = parseInt(originalImageWidth / (originalImageHeight / imageHeight), 10);
            }
          } else {
            imageWidth = originalImageWidth;
            imageHeight = originalImageHeight;
          }
          if (imageWidth > maxImageWidth) {
              imageWidth = maxImageWidth;
              imageHeight = parseInt(originalImageHeight / (originalImageWidth / imageWidth), 10);
          }
          if (imageHeight > maxImageHeight) {
              imageHeight = maxImageHeight;
              imageWidth = parseInt(originalImageWidth / (originalImageHeight / imageHeight), 10);
          }
          $image.width(imageWidth);
          $image.height(imageHeight);
        } else {
          imageWidth = self.options.maxWidth || originalImageWidth || maxImageWidth;
          imageHeight = self.options.maxHeight || originalImageHeight || maxImageHeight;
          $image.width(imageWidth);
          $image.height(imageHeight);
        }
      }
      self.showImage();
    };
    preloader.src = this.album[imageNumber].link;
    this.currentImageIndex = imageNumber;
  };

  Mahoubox.prototype.showImage = function() {
    this.$mahoubox.find('.lb-loader').stop(true).hide();
    
    this.$mahoubox.find('.lb-image').fadeIn(this.options.imageFadeDuration, () => {
        this.applyTransform(); 
        this.updateNav();
        this.updateDetails();
        this.preloadNeighboringImages();
        this.enableKeyboardNav();
        this.setupInteractionHandlers();
    });
  };

  Mahoubox.prototype.updateNav = function() {
    var alwaysShowNav = false;
    try {
      document.createEvent('TouchEvent');
      alwaysShowNav = (this.options.alwaysShowNavOnTouchDevices) ? true : false;
    } catch (e) {}

    this.$mahoubox.find('.lb-nav').show();

    if (this.album.length > 1) {
      if (this.options.wrapAround) {
        if (alwaysShowNav) {
          this.$mahoubox.find('.lb-prev, .lb-next').css('opacity', '1');
        }
        this.$mahoubox.find('.lb-prev, .lb-next').show();
      } else {
        if (this.currentImageIndex > 0) {
          this.$mahoubox.find('.lb-prev').show();
          if (alwaysShowNav) {
            this.$mahoubox.find('.lb-prev').css('opacity', '1');
          }
        }
        if (this.currentImageIndex < this.album.length - 1) {
          this.$mahoubox.find('.lb-next').show();
          if (alwaysShowNav) {
            this.$mahoubox.find('.lb-next').css('opacity', '1');
          }
        }
      }
    }
  };

  Mahoubox.prototype.updateDetails = function() {
    var self = this;
    if (typeof this.album[this.currentImageIndex].title !== 'undefined' &&
      this.album[this.currentImageIndex].title !== '') {
      var $caption = this.$mahoubox.find('.lb-caption');
      if (this.options.sanitizeTitle) {
        $caption.text(this.album[this.currentImageIndex].title);
      } else {
        $caption.html(this.album[this.currentImageIndex].title);
      }
      $caption.fadeIn('fast');
    }

    if (this.album.length > 1 && this.options.showImageNumberLabel) {
      var labelText = this.imageCountLabel(this.currentImageIndex + 1, this.album.length);
      this.$mahoubox.find('.lb-number').text(labelText).fadeIn('fast');
    } else {
      this.$mahoubox.find('.lb-number').hide();
    }

    this.$outerContainer.removeClass('animating');

    this.$mahoubox.find('.lb-dataContainer').fadeIn(this.options.resizeDuration);
  };

  Mahoubox.prototype.preloadNeighboringImages = function() {
    if (this.album.length > this.currentImageIndex + 1) {
      var preloadNext = new Image();
      preloadNext.src = this.album[this.currentImageIndex + 1].link;
    }
    if (this.currentImageIndex > 0) {
      var preloadPrev = new Image();
      preloadPrev.src = this.album[this.currentImageIndex - 1].link;
    }
  };

  Mahoubox.prototype.enableKeyboardNav = function() {
    this.$mahoubox.on('keyup.keyboard', $.proxy(this.keyboardAction, this));
  };

  Mahoubox.prototype.disableKeyboardNav = function() {
    this.$mahoubox.off('.keyboard');
  };

  Mahoubox.prototype.keyboardAction = function(event) {
    var KEYCODE_ESC        = 27;
    var KEYCODE_LEFTARROW  = 37;
    var KEYCODE_RIGHTARROW = 39;

    var keycode = event.keyCode;
    if (keycode === KEYCODE_ESC) {
      event.stopPropagation();
      this.end();
    } else if (keycode === KEYCODE_LEFTARROW) {
      if (this.currentImageIndex !== 0) {
        this.changeImage(this.currentImageIndex - 1);
      } else if (this.options.wrapAround && this.album.length > 1) {
        this.changeImage(this.album.length - 1);
      }
    } else if (keycode === KEYCODE_RIGHTARROW) {
      if (this.currentImageIndex !== this.album.length - 1) {
        this.changeImage(this.currentImageIndex + 1);
      } else if (this.options.wrapAround && this.album.length > 1) {
        this.changeImage(0);
      }
    }
  };
  
  Mahoubox.prototype.setupInteractionHandlers = function() {
    this.removeInteractionHandlers(); 
    this.$nav.on('mousedown.mahoubox-interaction', $.proxy(this.handleMouseDown, this));
    this.$nav.on('wheel.mahoubox-interaction', $.proxy(this.handleWheel, this));
  
    $(document).on('mousemove.mahoubox-interaction', $.proxy(this.handleMouseMove, this));
    $(document).on('mouseup.mahoubox-interaction', $.proxy(this.handleMouseUp, this));
  
    this.$nav.css('cursor', 'grab');
  };
  
  Mahoubox.prototype.removeInteractionHandlers = function() {
    if (this.$nav) {
      this.$nav.off('.mahoubox-interaction');
      this.$nav.css('cursor', '');
    }
    $(document).off('.mahoubox-interaction');
  };
  
  Mahoubox.prototype.handleMouseDown = function(e) {
    if (e.which !== 1) {
      return;
    }
    e.stopPropagation(); 
    e.preventDefault();
    this.isDragging = true;
    this.lastMouseX = e.pageX;
    this.lastMouseY = e.pageY;
    this.$nav.css('cursor', 'grabbing');
    this.$image.css('transition', 'none'); 
  };
  
  Mahoubox.prototype.handleMouseMove = function(e) {
    if (!this.isDragging) {
      return;
    }
    e.preventDefault();
    var dx = e.pageX - this.lastMouseX;
    var dy = e.pageY - this.lastMouseY;
  
    this.lastMouseX = e.pageX;
    this.lastMouseY = e.pageY;
  
    this.translateX += dx;
    this.translateY += dy;
  
    this.applyTransform();
  };
  
  Mahoubox.prototype.handleMouseUp = function(e) {
    if (!this.isDragging) {
      return;
    }
    e.preventDefault();
    this.isDragging = false;
    this.$nav.css('cursor', 'grab');
    this.$image.css('transition', 'transform 0.2s ease-out'); 
  };
  
  Mahoubox.prototype.handleWheel = function(e) {
    if (this.isDragging) { 
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    var delta = e.originalEvent.deltaY;
    var zoomFactor = 1.1;
    var oldScale = this.scale;
  
    var newScale = (delta < 0) ? oldScale * zoomFactor : oldScale / zoomFactor;
  
    newScale = Math.max(0.5, Math.min(newScale, 10));

    if (newScale === oldScale) {
        return;
    }
    
    var rect = this.$image[0].getBoundingClientRect();
    
    var mouseXOnElement = e.clientX - rect.left;
    var mouseYOnElement = e.clientY - rect.top;
  
    this.translateX += mouseXOnElement * (1 - newScale / oldScale);
    this.translateY += mouseYOnElement * (1 - newScale / oldScale);
    
    this.scale = newScale;

    this.$image.css('transition', 'none'); 
    this.applyTransform();
  };
  
  Mahoubox.prototype.applyTransform = function() {
    this.$image.css('transform', 'translate(' + this.translateX + 'px, ' + this.translateY + 'px) scale(' + this.scale + ')');
  };

  Mahoubox.prototype.end = function() {
    this.removeInteractionHandlers();
    this.disableKeyboardNav();
    this.$mahoubox.fadeOut(this.options.fadeDuration);
    this.$outerContainer.fadeOut(this.options.fadeDuration); 

    if (this.options.disableScrolling) {
      $('body').removeClass('lb-disable-scrolling');
    }
  };

  return new Mahoubox();
}));