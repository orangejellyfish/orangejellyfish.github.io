$(function () {
  $('#build-message').typed({
    strings: [
      'faster.',
      'robustly.',
      'for high availability.',
      'passionately.',
    ],
    loop: true,
    typeSpeed: 100,
    backDelay: 1000,
  });

  $('.home .navbar-wrapper .navbar')
    .removeClass('navbar-default')
    .addClass('navbar-transparent');
});
