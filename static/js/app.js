'use strict';

/* App */
var asciiTabApp = angular.module('asciiTabApp', [
  'ngRoute',
  'asciiTabControllers'
]);

asciiTabApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/tab/', {
        title: 'AsciiTabJS',
        templateUrl: '/static/partials/tabs.html',
        controller: 'tabListCtrl'
      }).
      when('/tab/:tabName', {
        title: ':tabName - AsciiTabJS',
        templateUrl: '/static/partials/tab.html',
        controller: 'tabCtrl'
      }).
      otherwise({
        redirectTo: '/tab/'
      });
  }
]);
