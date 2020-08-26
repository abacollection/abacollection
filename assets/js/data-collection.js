const $ = require('jquery');
const ms = require('ms');
const superagent = require('superagent');
const revHash = require('rev-hash');
const safeStringify = require('fast-safe-stringify');
const _ = require('lodash');

const logger = require('./logger.js');

const timers = {};
const percentCorrect = {};
let targets = {};

let hash;
let updatePC = false;

//
// handle instructions toggle
//
$('.instructions').click(function () {
  $(this).find('i').toggleClass('fa-chevron-right fa-chevron-down');
});

//
// handle clicker
//
// plus button
$('.clicker-plus').click(function () {
  const $parent = $(this).parents('.clicker');
  const $label = $parent.find('.clicker-label');
  const val = Number.parseInt($label.text(), 10);

  $label.text(val + 1);

  if (val === 0) $label.next().prop('disabled', false);
});

// minus button
$('.clicker-minus').click(function () {
  const $parent = $(this).parents('.clicker');
  const $label = $parent.find('.clicker-label');
  const val = Number.parseInt($label.text(), 10);

  if (val <= 1) {
    $label.text(0);
    $(this).prop('disabled', true);
  } else $label.text(val - 1);
});

//
// handle timer
//
// play button
$('.timer-play').click(function () {
  // get timer selectors
  const $timer = $(this).parents('.timer');
  const $hour = $timer.find('.timer-hour');
  const $minute = $timer.find('.timer-minute');
  const $second = $timer.find('.timer-second');
  const id = $(this).parents('.card').prop('id');

  // disable play button and enable pause button
  $(this).prop('disabled', true);
  $timer.find('.timer-pause').prop('disabled', false);
  $timer.find('.timer-reset').prop('disabled', true);
  $timer.find('.timer-save').prop('disabled', true);

  let offset = 0;
  if (timers[id]) {
    const hour = Number.parseInt($hour.text(), 10);
    const minute = Number.parseInt($minute.text(), 10);
    const second = Number.parseInt($second.text(), 10);

    offset = ms(`${hour}h`) + ms(`${minute}m`) + ms(`${second}s`);
  }

  const startTime = Date.now() - offset;
  // setup timer
  timers[id] = setInterval(function () {
    const duration = Date.now() - startTime;
    const seconds = (duration / ms('1s')).toFixed(0);
    const minutes = (duration / ms('1m')).toFixed(0);
    const hours = (duration / ms('1h')).toFixed(0);

    $hour.text(hours);
    $minute.text(minutes);
    $second.text(seconds);
  }, ms('1s'));
});

// pause button
$('.timer-pause').click(function () {
  // get timer selectors
  const $timer = $(this).parents('.timer');
  const id = $(this).parents('.card').prop('id');

  // disable pause button and enable play button
  $(this).prop('disabled', true);
  $timer.find('.timer-play').prop('disabled', false);
  $timer.find('.timer-reset').prop('disabled', false);
  $timer.find('.timer-save').prop('disabled', false);

  clearInterval(timers[id]);
});

// reset button
function resetTimer($this) {
  // get timer selectors
  const $timer = $this.parents('.timer');
  const $hour = $timer.find('.timer-hour');
  const $minute = $timer.find('.timer-minute');
  const $second = $timer.find('.timer-second');
  const id = $this.parents('.card').prop('id');

  $hour.text(0);
  $minute.text(0);
  $second.text(0);

  timers[id] = undefined;

  $this.prop('disabled', true);
  $timer.find('.timer-save').prop('disabled', true);
}

$('.timer-reset').click(function () {
  resetTimer($(this));
});

// save duration button
$('.duration .timer-save').click(function () {
  // get timer selectors
  const $timer = $(this).parents('.timer');
  const $hour = $timer.find('.timer-hour');
  const $minute = $timer.find('.timer-minute');
  const $second = $timer.find('.timer-second');
  const id = $(this).parents('.card').prop('id');

  const value =
    ms(`${$hour.text()}h`) +
    ms(`${$minute.text()}m`) +
    ms(`${$second.text()}s`);
  if (targets[id]) targets[id].push({ value });
  else targets[id] = [{ value }];

  resetTimer($timer.find('.timer-reset'));
});

//
// handle percent correct
//
// button clicked
$('button.percent-correct').click(function () {
  // get percent correct selectors
  const $parent = $(this).parents('.percent-correct');
  const $previous = $parent.find('.percent-correct-previous');
  const $next = $parent.find('.percent-correct-next');
  const $label = $parent.find('.percent-correct-label');
  let trial = $label.data('trial');
  const id = $(this).parents('.card').prop('id');

  // set data value
  if (!Array.isArray(percentCorrect[id])) percentCorrect[id] = [];

  if ($(this).hasClass('percent-correct-correct'))
    percentCorrect[id][trial - 1] = 'correct';
  else if ($(this).hasClass('percent-correct-approximation'))
    percentCorrect[id][trial - 1] = 'approximation';
  else if ($(this).hasClass('percent-correct-incorrect'))
    percentCorrect[id][trial - 1] = 'incorrect';

  updatePC = true;

  // bump trial and total
  trial++;
  const total = percentCorrect[id].length;
  // write label
  $label.text(`${trial} / ${total + 1}`);
  // change data stored
  $label.data('trial', trial);
  $label.data('total', total + 1);

  // if trial is above 1 enable previous button
  if (trial > 1) $previous.prop('disabled', false);
  // if trial is equal to total disable next button
  if (trial === total + 1) $next.prop('disabled', true);

  // remove selection class
  $parent
    .find(
      '.percent-correct-correct,.percent-correct-approximation,.percent-correct-incorrect'
    )
    .removeClass('btn-primary');

  // add selection class
  $parent
    .find(`.percent-correct-${percentCorrect[id][trial - 1]}`)
    .addClass('btn-primary');
});

// previous button clicked
$('.percent-correct-previous').click(function () {
  // get selectors
  const $parent = $(this).parents('.percent-correct');
  const $label = $parent.find('.percent-correct-label');
  let trial = $label.data('trial');
  const total = $label.data('total');
  const id = $(this).parents('.card').prop('id');

  trial--;
  $label.text(`${trial} / ${total}`);
  $label.data('trial', trial);

  // remove selection class
  $parent
    .find(
      '.percent-correct-correct,.percent-correct-approximation,.percent-correct-incorrect'
    )
    .removeClass('btn-primary');

  // add selection class
  $parent
    .find(`.percent-correct-${percentCorrect[id][trial - 1]}`)
    .addClass('btn-primary');

  // if trial is 1 disable button
  if (trial === 1) $(this).prop('disabled', true);
  // if trial does not equal total enable next button
  if (trial !== total)
    $parent.find('.percent-correct-next').prop('disabled', false);
});

// next button clicked
$('.percent-correct-next').click(function () {
  // get selectors
  const $parent = $(this).parents('.percent-correct');
  const $label = $parent.find('.percent-correct-label');
  let trial = $label.data('trial');
  const total = $label.data('total');
  const id = $(this).parents('.card').prop('id');

  trial++;
  $label.text(`${trial} / ${total}`);
  $label.data('trial', trial);

  // remove selection class
  $parent
    .find(
      '.percent-correct-correct,.percent-correct-approximation,.percent-correct-incorrect'
    )
    .removeClass('btn-primary');

  // add selection class
  $parent
    .find(`.percent-correct-${percentCorrect[id][trial - 1]}`)
    .addClass('btn-primary');

  // if trial is equal to total disable button
  if (trial === total) $(this).prop('disabled', true);
  // if trial does not equal 1 enable previous button
  if (trial !== 1)
    $parent.find('.percent-correct-previous').prop('disabled', false);
});

//
// handle rate
//
// save rate button
$('.rate .timer-save').click(function () {
  const value = {};
  // get selectors
  const $parent = $(this).parents('.rate');
  const $correctLabel = $parent.find('.correct .clicker-label');
  const $incorrectLabel = $parent.find('.incorrect .clicker-label');
  const $hour = $parent.find('.timer-hour');
  const $minute = $parent.find('.timer-minute');
  const $second = $parent.find('.timer-second');
  const id = $(this).parents('.card').prop('id');

  // correct data
  value.correct = Number.parseInt($correctLabel.text(), 10);
  $correctLabel.text(0);
  $parent.find('.correct .clicker-minus').prop('disabled', true);

  // incorrect data
  value.incorrect = Number.parseInt($incorrectLabel.text(), 10);
  $incorrectLabel.text(0);
  $parent.find('.incorrect .clicker-minus').prop('disabled', true);

  // timer
  value.counting_time =
    ms(`${$hour.text()}h`) +
    ms(`${$minute.text()}m`) +
    ms(`${$second.text()}s`);
  resetTimer($parent.find('.timer-reset'));

  if (targets[id]) targets[id].push({ value });
  else targets[id] = [{ value }];
});

//
// GET Data
//
async function getData(res) {
  try {
    if (!res)
      res = await superagent
        .get(window.location.pathname)
        .set('Accept', 'application/json')
        .retry(3)
        .send({ targets });

    const { body } = res;

    if (body.hash === hash) return;

    hash = body.hash;

    Object.entries(_.omit(body, 'hash')).forEach((entry) => {
      const [id, data] = entry;

      $(`#${id} .previous-data`).text(
        `Previous: ${data.previous ? data.previous : 'NA'}`
      );
      $(`#${id} .current-data`).text(
        `Current: ${data.current ? data.current : 'NA'}`
      );

      if (data.data_type === 'Frequency') {
        data.current = data.current ? data.current : 0;
        $(`#${id} .clicker-label`).text(data.current);
        $(`#${id} .clicker-label`).data('value', data.current);

        $(`#${id} .clicker-minus`).prop('disabled', data.current === 0);
      } else if (data.data_type === 'Percent Correct') {
        percentCorrect[id] = data.percentCorrect;
        percentCorrect.hash = revHash(
          safeStringify(_.omit(percentCorrect, 'hash'))
        );

        const $label = $(`#${id} .percent-correct-label`);
        const total = percentCorrect[id].length + 1;
        const trial =
          $label.data('trial') === $label.data('total')
            ? total
            : $label.data('trial');

        $label.data('trial', trial);
        $label.data('total', total);
        $label.text(`${trial} / ${total}`);

        // remove selection class
        $(
          `#${id} .percent-correct-correct,.percent-correct-approximation,.percent-correct-incorrect`
        ).removeClass('btn-primary');

        // add selection class
        $(`#${id} .percent-correct-${percentCorrect[id][trial - 1]}`).addClass(
          'btn-primary'
        );

        // if trial is equal to total disable button
        $(`#${id} .percent-correct-next`).prop('disabled', trial === total);
        // if trial does not equal 1 enable previous button
        $(`#${id} .percent-correct-previous`).prop('disabled', trial === 1);
      }
    });
  } catch (err) {
    logger.error(err);
  }
}

//
// POST Data
//
async function postData() {
  try {
    // add percent correct data to target
    if (updatePC) {
      Object.entries(_.omit(percentCorrect, 'hash')).forEach((entry) => {
        const [id, data] = entry;

        if (data.length !== 0) targets[id] = data;
      });

      updatePC = false;
    }

    // add frequency data
    $('.frequency .clicker-label').each(function () {
      const id = $(this).parents('.card').prop('id');
      const prevValue = Number.parseInt($(this).data('value'), 10);
      const value = Number.parseInt($(this).text(), 10) - prevValue;

      if (value !== 0) targets[id] = { value };
    });

    // return early if there has been no changes
    if (_.isEmpty(targets)) return getData();

    const res = await superagent
      .post(window.location.pathname)
      .set('Accept', 'application/json')
      .set('x-csrf-token', window._csrf)
      .retry(3)
      .send({ targets });

    if (res.status === 200) {
      targets = {};
      await getData(res);
    } else await getData();
  } catch (err) {
    logger.error(err);
  }
}

(async () => {
  await getData();
})();

setInterval(async () => {
  await postData();
}, ms('30s'));

window.addEventListener('beforeunload', async () => {
  await postData();
});
