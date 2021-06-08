const $ = require('jquery');
const superagent = require('superagent');

const logger = require('./logger.js');

$(document).on('click', '#addClientBtn', () => {
  $('#addForm').prop('hidden', false);
});

$(document).on('click', '#cancelAddBtn', () => {
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

$(document).on('click', '.share-btn', async function (event) {
  try {
    event.preventDefault();

    const $modal = $('#modal-share');
    $('#spinner').addClass('show d-block');

    const id = $(this).data('id');
    const name = $(this).data('name');

    $('#share-title').text(name);

    $modal.modal('show');

    const res = await superagent
      .get(`${window.location.pathname}/${id}/share`)
      .retry(3)
      .send();

    $('#share').html(res.body.message);

    // Hide spinner
    $('#spinner').removeClass('show d-block');
  } catch (err) {
    logger.error(err);
  }
});
