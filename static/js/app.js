'use strict';

/* App */

document.addEventListener("touchstart", function(){}, true);

var asciiTabApp = angular.module('asciiTabApp', [
  'ngRoute',
  'asciiTabControllers'
]);

asciiTabApp.config(['$routeProvider', '$httpProvider',
  function($routeProvider, $httpProvider) {
    $httpProvider.defaults.cache = false;

    $routeProvider.
      when('/tab/', {
        templateUrl: '/static/partials/tab.html',
        controller: 'tabCtrl'
      }).
      when('/tab/:tabName', {
        templateUrl: '/static/partials/tab.html',
        controller: 'tabCtrl'
      }).
      otherwise({
        redirectTo: '/tab/'
      });
  }
]);
