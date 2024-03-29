﻿/**
 * CKEditor plugin: Dragable image resizing for Webkit
 * - Shows semi-transparent overlay while resizing
 * - Enforces Aspect Ratio (unless holding shift)
 * - Snap to size of other images in editor
 * - Escape while dragging cancels resize
 *
 */
(function() {
  "use strict";

  var PLUGIN_NAME = 'webkitdrag';

  var IMAGE_SNAP_TO_SIZE = 7;

  /**
   * Initializes the plugin
   */
  CKEDITOR.plugins.add(PLUGIN_NAME, {
    onLoad: function() {
      // This plugin only applies to Webkit.
      if (!CKEDITOR.env.webkit) {
        return;
      }

      // CSS is added in a compressed form
      CKEDITOR.addCss('img::selection{color:rgba(0,0,0,0)}img.cke-resize {outline: 1px dashed #000}#ckimgrsz{position:absolute;width:0;height:0;cursor:default}#ckimgrsz .preview{position:absolute;top:0;left:0;width:0;height:0;background-size:100% 100%;opacity:.65;outline:1px dashed #000}#ckimgrsz span{position:absolute;width:5px;height:5px;background:#fff;border:1px solid #000}#ckimgrsz span:hover,#ckimgrsz span.active{background:#000}#ckimgrsz span.tl,#ckimgrsz span.br{cursor:nwse-resize}#ckimgrsz span.tm,#ckimgrsz span.bm{cursor:ns-resize}#ckimgrsz span.tr,#ckimgrsz span.bl{cursor:nesw-resize}#ckimgrsz span.lm,#ckimgrsz span.rm{cursor:ew-resize}body.dragging-tl,body.dragging-tl *,body.dragging-br,body.dragging-br *{cursor:nwse-resize!important}body.dragging-tm,body.dragging-tm *,body.dragging-bm,body.dragging-bm *{cursor:ns-resize!important}body.dragging-tr,body.dragging-tr *,body.dragging-bl,body.dragging-bl *{cursor:nesw-resize!important}body.dragging-lm,body.dragging-lm *,body.dragging-rm,body.dragging-rm *{cursor:ew-resize!important}');
    },
    init: function(editor) {
      // This plugin only applies to Webkit
      if (!CKEDITOR.env.webkit) {
        return;
      }
      //onDomReady handler
      editor.on('contentDom', function(evt) {
        init(editor);
      });
    }
  });

  function init(editor) {
    var window = editor.window.$, document = editor.document.$, body = document.body;
    var snapToSize = (typeof IMAGE_SNAP_TO_SIZE == 'undefined') ? null : IMAGE_SNAP_TO_SIZE;

    function DragEvent() {
      this.events = {
        mousemove: bind(this.mousemove, this),
        keydown: bind(this.keydown, this),
        mouseup: bind(this.mouseup, this)
      };
    }

    DragEvent.prototype = {
      start: function(e) {
        if (e.button !== 0) {
          //right-click or middle-click
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.target = e.target;
        this.attr = e.target.className;
        this.startPos = {x: e.clientX, y: e.clientY};
        this.update(e);
        var events = this.events;
        document.addEventListener('mousemove', events.mousemove, false);
        document.addEventListener('keydown', events.keydown, false);
        document.addEventListener('mouseup', events.mouseup, false);
        body.className += ' dragging-' + this.attr;
        this.onStart && this.onStart();
      },
      update: function(e) {
        this.currentPos = {x: e.clientX, y: e.clientY};
        this.delta = {x: e.clientX - this.startPos.x, y: e.clientY - this.startPos.y};
        this.keys = {shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey};
      },
      mousemove: function(e) {
        this.update(e);
        this.onDrag && this.onDrag();
        if (e.which === 0) {
          //mouse button released outside window; mouseup wasn't fired (Chrome)
          this.mouseup(e);
        }
      },
      keydown: function(e) {
        //escape key cancels dragging
        if (e.keyCode == 27) {
          this.release();
        }
      },
      mouseup: function(e) {
        this.update(e);
        this.release();
        this.onComplete && this.onComplete();
      },
      release: function() {
        body.className = body.className.replace('dragging-' + this.attr, '');
        var events = this.events;
        document.removeEventListener('mousemove', events.mousemove, false);
        document.removeEventListener('keydown', events.keydown, false);
        document.removeEventListener('mouseup', events.mouseup, false);
        this.onRelease && this.onRelease();
      }
    };

    function Resizer(element) {
      this.el = element;
      this.events = {
        initDrag: bind(this.initDrag, this)
      };
      this.init();
      this.show();
    }

    Resizer.prototype = {
      init: function() {
        var old = Resizer.instance;
        Resizer.instance = this;
        if (old) {
          //reuse existing dom elements
          old.hide();
          this.container = old.container;
          this.preview = old.preview;
          this.handles = old.handles;
          return;
        }
        var container = this.container = document.createElement('div');
        container.id = 'ckimgrsz';
        var preview = this.preview = document.createElement('div');
        preview.className = 'preview';
        container.appendChild(preview);
        var handles = this.handles = {};
        handles.tl = document.createElement('span');
        handles.tl.className = 'tl';
        handles.tm = document.createElement('span');
        handles.tm.className = 'tm';
        handles.tr = document.createElement('span');
        handles.tr.className = 'tr';
        handles.lm = document.createElement('span');
        handles.lm.className = 'lm';
        handles.rm = document.createElement('span');
        handles.rm.className = 'rm';
        handles.bl = document.createElement('span');
        handles.bl.className = 'bl';
        handles.bm = document.createElement('span');
        handles.bm.className = 'bm';
        handles.br = document.createElement('span');
        handles.br.className = 'br';
        for (var n in handles) {
          container.appendChild(handles[n]);
        }
      },
      show: function() {
        if (snapToSize) {
          this.otherImages = toArray(document.getElementsByTagName('img'));
          this.otherImages.splice(this.otherImages.indexOf(this.el), 1);
        }
        var box = this.box = getBoundingBox(window, this.el);
        this.container.style.left = box.left + 'px';
        this.container.style.top = box.top + 'px';
        body.appendChild(this.container);
        this.showHandles();
      },
      hide: function() {
        if (this.container.parentNode) {
          this.hideHandles();
          this.container.parentNode.removeChild(this.container);
        }
      },
      initDrag: function(e) {
        var resizer = this;
        var drag = new DragEvent();
        drag.onStart = function() {
          resizer.showPreview();
          resizer.isDragging = true;
          editor.getSelection().lock();
        };
        drag.onDrag = function() {
          resizer.calculateSize(this);
          resizer.updatePreview();
          resizer.updateHandles(resizer.previewBox);
        };
        drag.onRelease = function() {
          resizer.isDragging = false;
          resizer.hidePreview();
          resizer.hide();

          editor.getSelection().unlock();

          // Save an undo snapshot before the image is permanently changed.
          editor.fire('saveSnapshot');
        };
        drag.onComplete = function() {
          resizer.resizeComplete();

          // Save another snapshot after the image is changed.
          editor.fire('saveSnapshot');
        };
        drag.start(e);
      },
      updateHandles: function(box) {
        var handles = this.handles;
        handles.tl.style.left = '-3px';
        handles.tl.style.top = '-3px';
        handles.tm.style.left = (Math.round(box.width / 2) - 3) + 'px';
        handles.tm.style.top = '-3px';
        handles.tr.style.left = (box.width - 4) + 'px';
        handles.tr.style.top = '-3px';
        handles.lm.style.left = '-3px';
        handles.lm.style.top = (Math.round(box.height / 2) - 3) + 'px';
        handles.rm.style.left = (box.width - 4) + 'px';
        handles.rm.style.top = (Math.round(box.height / 2) - 3) + 'px';
        handles.bl.style.left = '-3px';
        handles.bl.style.top = (box.height - 4) + 'px';
        handles.bm.style.left = (Math.round(box.width / 2) - 3) + 'px';
        handles.bm.style.top = (box.height - 4) + 'px';
        handles.br.style.left = (box.width - 4) + 'px';
        handles.br.style.top = (box.height - 4) + 'px';
      },
      showHandles: function() {
        var handles = this.handles;
        this.updateHandles(this.box);
        for (var n in handles) {
          handles[n].style.display = 'block';
          handles[n].addEventListener('mousedown', this.events.initDrag, false);
        }
        this.el.className += ' cke-resize';
      },
      hideHandles: function() {
        var handles = this.handles;
        for (var n in handles) {
          handles[n].removeEventListener('mousedown', this.events.initDrag, false);
          handles[n].style.display = 'none';
        }
        this.el.className = this.el.className.replace(/[ ]?cke-resize/g, '');
      },
      showPreview: function() {
        this.preview.style.backgroundImage = 'url("' + this.el.src + '")';
        this.preview.style.display = 'block';
        // Move handles to the preview so they resize with it.
        for (var n in this.handles) {
          this.preview.appendChild(this.handles[n]);
        }
        this.calculateSize();
        this.updatePreview();
        this.preview.style.display = 'block';
      },
      updatePreview: function() {
        var box = this.previewBox;
        this.preview.style.top = box.top + 'px';
        this.preview.style.left = box.left + 'px';
        this.preview.style.width = box.width + 'px';
        this.preview.style.height = box.height + 'px';
      },
      hidePreview: function() {
        var box = getBoundingBox(window, this.preview);
        this.result = {width: box.width, height: box.height};
        // Move handles back to the wrapping container.
        for (var n in this.handles) {
          this.container.appendChild(this.handles[n]);
        }
        this.preview.style.display = 'none';
      },
      calculateSize: function(data) {
        var box = this.previewBox = {top: 0, left: 0, width: this.box.width, height: this.box.height};
        if (!data) return;
        var attr = data.target.className;
        if (~attr.indexOf('r')) {
          box.width = Math.max(32, this.box.width + data.delta.x);
        }
        if (~attr.indexOf('b')) {
          box.height = Math.max(32, this.box.height + data.delta.y);
        }
        if (~attr.indexOf('l')) {
          box.width = Math.max(32, this.box.width - data.delta.x);
        }
        if (~attr.indexOf('t')) {
          box.height = Math.max(32, this.box.height - data.delta.y);
        }
        //if dragging corner, enforce aspect ratio (unless shift key is being held)
        if (attr.indexOf('m') < 0 && !data.keys.shift) {
          var ratio = this.box.width / this.box.height;
          if (box.width / box.height > ratio) {
            box.height = Math.round(box.width / ratio);
          } else {
            box.width = Math.round(box.height * ratio);
          }
        }
        if (snapToSize) {
          var others = this.otherImages;
          for (var i = 0; i < others.length; i++) {
            var other = getBoundingBox(window, others[i]);
            if (Math.abs(box.width - other.width) <= snapToSize && Math.abs(box.height - other.height) <= snapToSize) {
              box.width = other.width;
              box.height = other.height;
              break;
            }
          }
        }
        //recalculate left or top position
        if (~attr.indexOf('l')) {
          box.left = this.box.width - box.width;
        }
        if (~attr.indexOf('t')) {
          box.top = this.box.height - box.height;
        }
      },
      resizeComplete: function() {
        this.el.style.width = this.result.width + 'px';
        this.el.style.height = this.result.height + 'px';
      }
    };
    Resizer.hide = function() {
      this.instance && this.instance.hide();
    };

    editor.on('selectionChange', function(evt) {
      var data = evt.data;

      // If an element is selected and that element is an IMG.
      if (data.selection.getType() != CKEDITOR.SELECTION_NONE && data.selection.getStartElement().is('img')) {
        // And we're not right or middle clicking on the image.
        if (!window.event || !window.event.button || window.event.button === 0) {
          new Resizer(data.selection.getStartElement().$);
        }
      } else {
        Resizer.hide();
      }
    });
    editor.on('beforeUndoImage', function() {
      // Remove the handles before undo images are saved.
      Resizer.hide();
    });
    editor.on('afterUndoImage', function() {
      // Restore the handles after undo images are saved.
      editor.forceNextSelectionCheck();
      editor.selectionChange();
    });
    editor.on('beforeModeUnload', function self() {
      editor.removeListener('beforeModeUnload', self);
      Resizer.hide();
    });

    // Check resizes to the window and update the selection.
    var resizeTimeout = false;
    editor.window.on('resize', resizeHandler);
    function resizeHandler() {
      if (!resizeTimeout) {
        setTimeout(function() {
          editor.forceNextSelectionCheck();
          editor.selectionChange();
          resizeTimeout = false;
        }, 10);
        resizeTimeout = true;
      }
    }

  }

  //helper functions
  function toArray(obj) {
    var len = obj.length, arr = new Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = obj[i];
    }
    return arr;
  }

  function bind(fn, ctx) {
    if (fn.bind) {
      return fn.bind(ctx);
    }
    return function() {
      fn.apply(ctx, arguments);
    };
  }

  function getBoundingBox(window, el) {
    var rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.pageXOffset,
      top: rect.top + window.pageYOffset,
      width: rect.width,
      height: rect.height
    };
  }
})();
