const $ = require('jquery');
const Popper = require('popper.js');
const Clipboard = require('clipboard');
const { randomstring } = require('@sidoshi/random-string');
const Swal = require('sweetalert2');

// Load jQuery and Bootstrap
// <https://stackoverflow.com/a/34340392>
// <https://github.com/FezVrasta/popper.js/issues/287#issuecomment-321887784>
window.$ = $;
window.jQuery = $;

// Required for bootstrap (we could use the bundle but this is cleaner)
window.Popper = Popper;

// eslint-disable-next-line import/no-unassigned-import
require('bootstrap');

const $body = $('body');

const {
  ajaxForm,
  changeHashOnScroll,
  clipboard,
  confirmPrompt,
  customFileInput,
  flash,
  returnTo,
  resizeNavbarPadding,
  modalAnchor,
  handleHashOnLoad,
  handleHashChange
} = require('@ladjs/assets');

// Resize navbar padding on load, window resize, and navbar collapse/show
resizeNavbarPadding($);

// Import waypoints (see below example for how to use + `yarn add waypoints`)
// require('waypoints/lib/jquery.waypoints.js');

// highlight.js
// const hljs = require('highlight.js');
// hljs.initHighlightingOnLoad();

// Allow ?return_to=/some/path
returnTo();

// Flash and toast messaging with sweetalert2
flash();

// Handle hashes when page loads
// <http://stackoverflow.com/a/29853395>
handleHashOnLoad();
$(window).on('resize.resizeNavbarPadding', () => {
  resizeNavbarPadding($);
});
$('.navbar-collapse').on('hidden.bs.collapse shown.bs.collapse', () => {
  resizeNavbarPadding($);
});

// Handle modals on anchor tags with data-target specified (preserve href)
$('a[data-toggle="modal-anchor"]').on('click.modalAnchor', modalAnchor);

// Adjust the hash of the page as you scroll down
// (e.g. if you scroll past a section "Section A" to "Section B"
// then the URL bar will update to #section-b
$(window).on('scroll.changeHashOnScroll', changeHashOnScroll);

// Handle hash change when user clicks on links
$body.on('click.handleHashChange', "a[href^='#']", handleHashChange);

// Automatically show tooltips and popovers
$('[data-toggle="tooltip"]').tooltip();
$('[data-toggle="popover"]').popover();

// Handle custom file inputs
//
// Example usage:
//
// <label class="d-block">
//   <input required="required" data-toggle="custom-file" data-target="#company-logo" type="file" name="company_logo" accept="image/*" class="custom-file-input">
//   <span id="company-logo" class="custom-file-control custom-file-name" data-btn="{{ t('Select File') }}" data-content="{{ t('Upload company logo...') }}"></span>
// </label>
$body.on(
  'change.customFileInput',
  'input[type="file"][data-toggle="custom-file"]',
  customFileInput
);

// Handle clipboard copy event
clipboard();

// Bind beta aggreement
const betaPrompt = async (ev) => {
  // Get the form or button
  const $element = $(ev.currentTarget);

  const title = 'Beta Aggreement';

  const html = `<p class="text-left">This product is currently in beta and is subject to change. These changes maybe dramatic and often. All efforts to keep your data safe will be made, however some data loss may occur.</p>
  <p></p>
  <p class="text-left">If any pay structures change after you sign up, we will give you a 1 month notice before the change effects you.</p>
  <p></p>
  <p class="text-left">Please let us know of any bugs you find or ideas to improve the product!</p>
  <p class="text-left">Thank you for your support and choosing to be a part of the beta!!</p>`;

  const confirmed = $element.data('beta');
  if (!confirmed) {
    ev.preventDefault();
    const result = await Swal.fire({
      title,
      html,
      type: 'question',
      showCancelButton: true
    });
    if (!result.value) {
      return;
    }

    // Set beta state to true
    $element.data('beta', true);
    // Trigger click again
    $element.trigger(ev.type);
    // Reset beta after click
    $element.data('beta', false);
  }
};

$body.on('submit.betaPrompt', 'button[data-toggle="beta-prompt"]', betaPrompt);
$body.on('click.betaPrompt', 'button[data-toggle="beta-prompt"]', betaPrompt);

// Bind confirm prompt event for clicks and form submissions
$body.on(
  'submit.confirmPrompt',
  'form.confirm-prompt, form[data-toggle="confirm-prompt"]',
  confirmPrompt
);
$body.on(
  'click.confirmPrompt',
  'button.confirm-prompt, input.confirm-prompt',
  confirmPrompt
);

// Bind ajax form submission and handle Stripe tokens in forms
$body.on('submit.ajaxForm', 'form.ajax-form', ajaxForm);

// Example for how to detect waypoint scrolling:
//
// Detect when we scroll to the #the-web-server selector
// so that we can hide the "Learn More" banner on bottom
/*
  if ($('#learn-more').length > 0 && $('#the-web-server').length > 0) {
    const waypoint = new window.Waypoint({
      element: $('#the-web-server').get(0),
      handler: direction => {
        if (direction === 'up') $('#learn-more').addClass('show');
        else if (direction === 'down') $('#learn-more').removeClass('show');
      },
      offset: '25%'
    });
    // When the page loads we need to make sure its checked
    waypoint.context.refresh();
  }
  */

// all <code> blocks should have a toggle tooltip and clipboard
function errorHandler(ev) {
  ev.clearSelection();
  $(ev.trigger)
    .tooltip('dispose')
    .tooltip({
      title: 'Please manually copy to clipboard',
      html: true,
      placement: 'bottom'
    })
    .tooltip('show');
  $(ev.trigger).on('hidden.bs.tooltip', () => $(ev.trigger).tooltip('dispose'));
}

function successHandler(ev) {
  ev.clearSelection();
  let $container = $(ev.trigger).parents('pre:first');
  if ($container.length === 0) {
    $container = $(ev.trigger);
  }

  $container
    .tooltip('dispose')
    .tooltip({
      title: 'Copied!',
      placement: 'bottom'
    })
    .tooltip('show');
  $container.on('hidden.bs.tooltip', () => {
    $container.tooltip('dispose');
  });
}

if (Clipboard.isSupported()) {
  $body.on('mouseenter', 'code', function () {
    let $container = $(this).parents('pre:first');
    if ($container.length === 0) {
      $container = $(this);
    }

    $container
      .css('cursor', 'pointer')
      .tooltip({
        title: 'Click to copy',
        placement: 'bottom',
        trigger: 'manual'
      })
      .tooltip('show');
  });
  $body.on('mouseleave', 'code', function () {
    let $container = $(this).parents('pre:first');
    if ($container.length === 0) {
      $container = $(this);
    }

    $container.tooltip('dispose').css('cursor', 'initial');
  });
  const clipboard = new Clipboard('code', {
    text(trigger) {
      return trigger.textContent;
    },
    target(trigger) {
      return trigger.tagName === 'CODE' ? trigger : trigger.closest('code');
    }
  });
  clipboard.on('success', successHandler);
  clipboard.on('error', errorHandler);
}

//
// generate random alias
//
// <https://en.wikipedia.org/wiki/Email_address#Local-part>
//
$body.on('click', '.generate-random-alias', function () {
  const target = $(this).data('target');
  if (!target) {
    return;
  }

  const $target = $(target);
  if ($target.lengh === 0) {
    return;
  }

  const string = randomstring({
    characters: 'abcdefghijklmnopqrstuvwxyz0123456789',
    length: 10
  });
  $target.val(string);
});

//
// toggle display of element
//
$body.on('click', '[data-toggle="toggle"]', function () {
  const target = $(this).data('target');
  $(target).slideToggle('slow');

  $(this).children('i').toggleClass('fa-caret-right fa-caret-down');
});
