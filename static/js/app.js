'use strict';

/* App */

document.addEventListener("touchstart", function(){}, true);

var asciiTabApp = angular.module('asciiTabApp', [
  'ngRoute',
  'asciiTabControllers'
]);

asciiTabApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/tab/', {
        templateUrl: '/static/partials/tabs.html',
        controller: 'tabListCtrl'
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
