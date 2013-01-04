/**
 * @file
 * Javascript functionality for Backstretch Formatter.
 */

(function ($) {

  Drupal.behaviors.backstretchFormatter = {
    attach: function (context, settings) {
      if (typeof settings.backstretchFormatter != 'undefined') {
        // Iterate all Backstretch configurations.
        $.each(settings.backstretchFormatter, function(id, options) {
          // Store the items.
          var items = options.items;
          // Remove the items from options.
          delete options.items;

          // Pass items and options to Backstretch with the specific selector.
          if (typeof options.selector == 'undefined') {
            $.backstretch(items, options);
          }
          else {
            $(options.selector).backstretch(items, options);
          }
        });
      }
    }
  };

})(jQuery);
