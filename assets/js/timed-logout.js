const $ = require('jquery');
const Swal = require('sweetalert2');
const ms = require('ms');

let timer;
let timeout;

async function warning() {
  const result = await Swal.fire({
    text: 'You are about to be logged out!!',
    icon: 'warning',
    showCancelButton: true,
    showCloseButton: false,
    cancelButtonText: 'Logout',
    confirmButtonText: 'Stay Logged In',
    timer: ms('1m'),
    timerProgressBar: true,
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  // If user dismisses then logout
  if (result.isDismissed) {
    window.location.pathname = `${window.LOCALE}/logout`;
    return;
  }

  // Reset timer
  clearTimeout(timer);
  timer = setTimeout(warning, timeout);
}

module.exports = () => {
  if (window._loginTimeout > ms('1m') && window.USER.email) {
    timeout = window._loginTimeout - ms('1m');
    // Set timeout to warn of logout timer
    timer = setTimeout(warning, timeout);

    // Reset timer any time a click occurs
    $('body').on('click', () => {
      clearTimeout(timer);
      timer = setTimeout(warning, timeout);
    });
  }
};
