$('#search-input').autocomplete({
    source: function(request, response) {
      $.getJSON('/searchjson', { query: request.term }, function(data) {
        response(data);
      });
    },
    minLength: 2,
    search: function() {
      $(this).autocomplete('instance')._renderMenu = function(ul, items) {
        var self = this;
        $.each(items, function(index, item) {
          self._renderItemData(ul, item);
        });
        $(ul).find('li:odd').addClass('odd');
      };
      // create the menu widget
      $('<ul>')
        .addClass('ui-menu')
        .appendTo($(this).autocomplete('widget'));
    }
  });