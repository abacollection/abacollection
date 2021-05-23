const $ = require('jquery');
const superagent = require('superagent');
const Apex = require('apexcharts');
const dayjs = require('dayjs');
const Sortable = require('sortablejs');

dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const logger = require('./logger.js');

let graph;
let ta;
const sortables = {};

$(document).on('click', '#addBtn', () => {
  $('#addForm').prop('hidden', false);

  if ($('#ta-form').length > 0) {
    $('#ta-form').prop('hidden', false);
  }
});

$(document).on('click', '#cancelAddBtn', () => {
  $('#addForm').prop('hidden', true);

  if ($('#ta-form').length > 0) {
    $('#ta-form').prop('hidden', true);
  }
});

$(document).on('click', '.edit-btn', function () {
  const $parent = $(this).parents('tr:first');
  const id = $parent.prop('id');
  const sortable = $(`#${id}-sortable`);

  sortables[id] = {
    original: sortable.html()
  };

  if (sortable === undefined) {
    sortables[id].sortable = Sortable.create(sortable[0]);
  }

  $parent.prop('hidden', true);
  $(`.edit-form#${id}-form`).prop('hidden', false);
  $(`.edit-form#${id}-form-ta`).prop('hidden', false);
});

$(document).on('click', '.edit-cancel-btn', function () {
  const $parent = $(this).parents('tr:first');
  const id = $parent.prop('id').replace('-form', '');

  $parent.prop('hidden', true);
  $(`.edit-form#${id}-form-ta`).prop('hidden', true);
  $(`tr#${id}`).prop('hidden', false);

  if (sortables[id].sortable !== undefined) {
    sortables[id].sortable.destroy();
  }

  $(`#${id}-sortable`).html(sortables[id].original);
  delete sortables[id];
});

$(document).on('click', '#dataAddBtn', () => {
  $('.dataAddForm').prop('hidden', false);
});

$(document).on('click', '#dataCancelAddBtn', () => {
  $('.dataAddForm').prop('hidden', true);
});

$(document).on('click', '.data-edit-btn', function () {
  const type = $(this).data('type');
  const $parent = $(this).parents('tr:first');
  const id = $parent.prop('id');

  if (type === 'Task Analysis') {
    $(`#${id}-actions`).prop('hidden', true);
    $(`#${id}-edit-actions`).prop('hidden', false);
    $(`#${id}-steps`).hide();
  } else {
    $parent.prop('hidden', true);
  }

  $(`.data-edit-form#${id}-form`).prop('hidden', false);
});

$(document).on('click', '.data-edit-cancel-btn', function () {
  const type = $(this).data('type');
  const $parent = $(this).parents('tr:first');

  if (type === 'Task Analysis') {
    const id = $parent.prop('id');
    $(`#${id}-edit-actions`).prop('hidden', true);
    $(`#${id}-actions`).prop('hidden', false);
    $(`.data-edit-form#${id}-form`).prop('hidden', true);
  } else {
    const id = $parent.prop('id').replace('-form', '');
    $parent.prop('hidden', true);
    $(`tr#${id}`).prop('hidden', false);
  }
});

$(document).on('click', '#graphTargetBtn', async function (event) {
  try {
    event.preventDefault();

    const $modal = $('#modal-graph-target');

    // Show spinner
    $('#spinner').addClass('show d-block');

    const id = $(this).data('id');
    const name = $(this).data('name');

    $('#graph-title').text(name);

    $modal.modal('show');

    const res = await superagent
      .get(`${window.location.pathname}/${id}/graph`)
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
      },
      noData: {
        text: 'No Data'
      }
    };

    if (body.yaxisMax) {
      options.yaxis.max = body.yaxisMax;
    }

    graph = new Apex(document.querySelector('#graph'), options);
    // Hide spinner
    $('#spinner').removeClass('show d-block');
    graph.render();
  } catch (err) {
    logger.error(err);
  }
});

$(document).on('click', '#dataTargetBtn', async function (event) {
  try {
    event.preventDefault();

    const $modal = $('#modal-data-target');
    $('#spinner').addClass('show d-block');

    const id = $(this).data('id');
    const name = $(this).data('name');

    $('#data-title').text(name);

    $modal.find('.modal-header .btn-group').data('id', id);

    $modal.modal('show');

    const res = await superagent
      .get(`${window.location.pathname}/${id}?rawData=true`)
      .retry(3)
      .send();

    // Hide spinner
    $('#spinner').removeClass('show d-block');
    $('#data').html(res.text);

    // Add timezone
    $('input[name="timezone"]').prop('value', dayjs.tz.guess());
  } catch (err) {
    logger.error(err);
  }
});

$('.interval').click(async function () {
  try {
    const $parent = $(this).parent('.btn-group');
    $('#spinner').addClass('show d-block');

    const id = $parent.data('id');

    $('#data').empty();

    const res = await superagent
      .get(
        `${window.location.pathname}/${id}?interval=${$(this).data(
          'interval'
        )}&rawData=true`
      )
      .retry(3)
      .send();

    $('#spinner').removeClass('show d-block');
    $('#data').html(res.text);

    $parent.find('.interval').removeClass('active');
    $(this).addClass('active');
  } catch (err) {
    logger.error(err);
  }
});

$('#modal-graph-target').on('hidden.bs.modal', () => {
  if (graph) {
    graph.destroy();
    graph = false;

    $('#graph').empty();
  }
});

$('#modal-data-target').on('hidden.bs.modal', function () {
  $('#data').empty();

  $(this).find('.interval').removeClass('active');
  $('#modal-data-target .interval').first().addClass('active');
});

//
// task analysis sorting setup
//
$(document).on('change', '#input-data_type', function (e) {
  if (e.target.value === 'Task Analysis') {
    const $parent = $(this).parents('tr#addForm');

    if (ta) {
      $parent.after(ta);
    } else {
      $parent.after(`
        <tr id="ta-form">
          <td colspan="4">
            <div class="input-group mb-3">
              <input type="text" class="form-control" id="ta-steps" name="ta-steps" placeholder="Steps for Task Analysis"/>
              <div class="input-group-append">
                <button class="btn btn-secondary" type="button" id="ta-add">
                  <i class="fa fa-fw fa-check"></i>
                </button>
              </div>
            </div>
            <ul id="sortable" class="list-group">
            </ul>
          </td>
        </tr>
      `);
    }

    Sortable.create(document.querySelector('#sortable'));
  } else if ($('#ta-form').length > 0) {
    ta = $('#ta-form').detach();
  }
});

function addTAStep() {
  $('#sortable').append(`
      <li class="list-group-item">
        <input type="hidden" name="ta" value="${$(
          '#ta-steps'
        ).val()}" form="add"/>
        <i class="fa fa-fw fa-grip-lines-vertical mt-1 mr-1"></i>
        ${$('#ta-steps').val()}
        <a href="#" class="float-right close-btn btn py-0">
          <i class="fa fa-fw fa-times"></i>
        </a>
      </li>
    `);
  $('#ta-steps').val('');
}

$(document).on('keydown', '#ta-steps', (e) => {
  if (e.keyCode === 13) {
    e.preventDefault();

    addTAStep();

    return false;
  }
});

$(document).on('click', '#ta-add', addTAStep);

$(document).on('click', '.close-btn', function () {
  $(this).parent().remove();
});
