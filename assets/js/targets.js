const $ = require('jquery');
const superagent = require('superagent');
const Apex = require('apexcharts');

const logger = require('./logger.js');

let graph;

$(document).on('click', '#editTargetBtn', function () {
  const id = $(this).data('id');
  const name = $(this).data('name');
  const description = $(this).data('description');

  $('#edit-form').prop('action', `${window.location.pathname}/${id}`);
  $('#edit-input-name').prop('value', name);
  $('#edit-input-description').prop('value', description);
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
