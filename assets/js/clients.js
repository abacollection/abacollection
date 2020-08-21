const $ = require('jquery');

$(document).on('click', '#addClientBtn', function () {
  $('#addForm').prop('hidden', false);
});

$(document).on('click', '#cancelAddBtn', function () {
  $('#addForm').prop('hidden', true);
});

$(document).on('click', '.edit-btn', function () {
  const $parent = $(this).parents('tr');
  const id = $parent.prop('id');

  $parent.prop('hidden', true);
  $(`.edit-form#${id}-form`).prop('hidden', false);
});

$(document).on('click', '.edit-cancel-btn', function () {
  const $parent = $(this).parents('tr');
  const id = $parent.prop('id').replace('-form', '');

  $parent.prop('hidden', true);
  $(`tr#${id}`).prop('hidden', false);
});
