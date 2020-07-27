const $ = require('jquery');

$(document).on('click', '#editProgramBtn', function() {
  const id = $(this).data('id');
  const name = $(this).data('name');
  const description = $(this).data('description');

  $('#edit-form').prop('action', `${window.location.pathname}/${id}`);
  $('#edit-input-name').prop('value', name);
  $('#edit-input-description').prop('value', description);
});
