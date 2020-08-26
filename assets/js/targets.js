const $ = require('jquery');
const superagent = require('superagent');
const Apex = require('apexcharts');

const logger = require('./logger.js');

let graph;

$(document).on('click', '#addBtn', function () {
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

$(document).on('click', '#dataAddBtn', function () {
  $('#addForm').prop('hidden', false);
});

$(document).on('click', '#dataCancelAddBtn', function () {
  $('#addForm').prop('hidden', true);
});

$(document).on('click', '.data-edit-btn', function () {
  const $parent = $(this).parents('tr');
  const id = $parent.prop('id');

  $parent.prop('hidden', true);
  $(`.data-edit-form#${id}-form`).prop('hidden', false);
});

$(document).on('click', '.edit-cancel-btn', function () {
  const $parent = $(this).parents('tr');
  const id = $parent.prop('id').replace('-form', '');

  $parent.prop('hidden', true);
  $(`tr#${id}`).prop('hidden', false);
});

$(document).on('click', '#graphTargetBtn', async function (event) {
  try {
    event.preventDefault();

    const $modal = $('#modal-graph-target');
    const $spinner = $('#graphSpinner');

    const id = $(this).data('id');
    const name = $(this).data('name');

    $('#graph-title').text(name);

    $modal.modal('show');

    const res = await superagent
      .get(`${window.location.pathname}/${id}`)
      .set('Accept', 'application/json')
      .retry(3)
      .send();

    const { body } = res;

    const options = {
      chart: {
        type: 'line',
        title: body.title
      },
      series: body.series,
      xaxis: {
        type: 'datetime',
        title: {
          text: body.xaxisTitle,
          offsetY: 10
        }
      },
      yaxis: {
        title: {
          text: body.yaxisTitle
        }
      },
      stroke: {
        width: 1
      }
    };

    if (body.yaxisMax) options.yaxis.max = body.yaxisMax;

    graph = new Apex(document.querySelector('#graph'), options);
    // hide spinner
    $spinner.prop('hidden', true);
    graph.render();
  } catch (err) {
    logger.error(err);
  }
});

$(document).on('click', '#dataTargetBtn', async function (event) {
  try {
    event.preventDefault();

    const $modal = $('#modal-data-target');
    const $spinner = $('#dataSpinner');

    const id = $(this).data('id');
    const name = $(this).data('name');

    $('#data-title').text(name);

    $modal.find('.modal-header .btn-group').data('id', id);

    $modal.modal('show');

    const res = await superagent
      .get(`${window.location.pathname}/${id}`)
      .retry(3)
      .send();

    $spinner.prop('hidden', true);
    $('#data').html(res.text);
  } catch (err) {
    logger.error(err);
  }
});

$('.interval').click(async function () {
  try {
    const $parent = $(this).parent('.btn-group');
    const $spinner = $('#dataSpinner');

    const id = $parent.data('id');

    $('#data').empty();
    $spinner.prop('hidden', false);

    const res = await superagent
      .get(
        `${window.location.pathname}/${id}?interval=${$(this).data('interval')}`
      )
      .retry(3)
      .send();

    $spinner.prop('hidden', true);
    $('#data').html(res.text);

    $parent.find('.interval').removeClass('active');
    $(this).addClass('active');
  } catch (err) {
    logger.error(err);
  }
});

$('#modal-graph-target').on('hidden.bs.modal', function () {
  if (graph) {
    graph.destroy();
    graph = false;

    $('#graph').empty();
  }

  $('#graphSpinner').prop('hidden', false);
});

$('#modal-edit-target').on('hidden.bs.modal', function () {
  $(this).find('form').trigger('reset');
});

$('#modal-data-target').on('hidden.bs.modal', function () {
  $('#data').empty();
  $('#dataSpinner').prop('hidden', false);

  $(this).find('.interval').removeClass('active');
  $('#modal-data-target .interval').first().addClass('active');
});
