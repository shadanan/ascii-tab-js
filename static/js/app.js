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
      when('/tab/:tabName/:columns/:transpose', {
        templateUrl: '/static/partials/tab.html',
        controller: 'tabCtrl'
      }).
      when('/tab/:tabName', {
        redirectTo: '/tab/:tabName/2/0'
      }).
      otherwise({
        redirectTo: '/tab/'
      });
  }
]);
