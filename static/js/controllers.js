'use strict';

/* Controllers */

var asciiTabControllers = angular.module('asciiTabControllers', []);

var annotationPattern = /^(?:\[[a-zA-Z0-9\s]+\]|x\d+|\|)$/;

var chords = [
  '([CDEFGAB])',
  '(#|##|b|bb)?',
  '(',
    'maj|maj7|maj9|maj11|maj13|maj9#11|maj13#11|add9|maj7b5|maj7#5|',
    'm|m7|m9|m11|m13|m6|',
    'madd9|m\\(add9\\)|m6add9|m6\\(add9\\)|m7add9|m7\\(add9\\)|',
    'mmaj7|m\\(maj7\\)|mmaj9|m\\(maj9\\)|m7b5|m7#5|',
    '6|6/9|',
    '7|7sus4|7b5|7#5|7b9|7#9|7b5b9|7b5#9|7#5b9|7+5|7+9|7-5|7-9|',
    '7aug|7aug5|7dim5|7dim9|7sus2|7sus4|',
    '9|9#5|9aug5|9dim5|9sus|9sus4|',
    '11|11b9|11dim9|',
    '13|13#11|13b9|13dim9|13dim11|',
    'add2|add4|add9|',
    'aug|',
    'dim|dim7|dim11|dim13|',
    'sus|sus4|sus2|sus2sus4|',
    '-5',
  ')?',
  '(?:(/)([CDEFGAB])(#|##|b|bb)?)?'
].join('');

var chordPattern = RegExp('^' + chords + '$');

var spacer = "<div class='spacer'><div> </div><div> </div></div>";

function isAnnotationLine(line) {
  if (line.match(/^[a-zA-Z0-9,\s]+:\s/)) {
    return true;
  }

  if (line.match(/^(?:\[|\()[a-zA-Z0-9\s]+(?:\]|\))$/)) {
    return true;
  }

  return false;
}

function isChordLine(line) {
  var tokens = line
                .replace(/\[[a-zA-Z0-9\s]+\]/g, '')
                .trim().split(/\s+/);

  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i].match(annotationPattern)) {
      continue;
    }

    if (tokens[i].match(chordPattern)) {
      continue;
    }

    return false;
  }

  return true;
}

function annotateChords(line) {
  var result = []
  var tokens = line.split(/ /);

  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i][0] == '[' && tokens[i].slice(1).match(chordPattern)) {
      result.push("[<span class='chord'>" + tokens[i].slice(1) + "</span>");
    } else if (tokens[i].slice(-1) == ']' && tokens[i].slice(0, -1).match(chordPattern)) {
      result.push("<span class='chord'>" + tokens[i].slice(0, -1) + "</span>]");
    } else if (tokens[i].match(chordPattern)) {
      result.push("<span class='chord'>" + tokens[i] + "</span>");
    } else {
      result.push(tokens[i]);
    }
  }

  return result.join(' ');
}

function renderToken(chord, lyric) {
  return "<div class='lyric'>" +
    "<div>" + annotateChords(chord) + "</div>" +
    "<div>" + lyric + "</div></div>";
}

function joinChordWithVerse(chord, verse) {
  var pos = 0;
  var divs = [];

  var curTop = "";
  var curBottom = "";

  while (pos < chord.length || pos < verse.length) {
    var curc = pos < chord.length ? chord[pos] : ' ';
    var curv = pos < verse.length ? verse[pos] : ' ';

    if (curc == ' ' && curv == ' ') {
      divs.push(renderToken(curTop, curBottom));
      divs.push(spacer);
      curTop = "";
      curBottom = "";
    } else {
      curTop += curc;
      curBottom += curv;
    }

    pos += 1;
  }

  if (curTop != "" || curBottom != "") {
    divs.push(renderToken(curTop, curBottom));
  }

  return divs.join("");
}

asciiTabControllers.controller('tabListCtrl', ['$scope', '$http',
  function($scope, $http) {
    $http.get('/tab/').success(function(data) {
      $scope.tabs = data;
    });
  }
]);

asciiTabControllers.controller('tabCtrl', ['$scope', '$http', '$routeParams', '$sce',
  function($scope, $http, $routeParams, $sce) {
    $scope.renderHtml = function(html_code) {
      return $sce.trustAsHtml(html_code);
    };

    $scope.tabName = $routeParams.tabName;
    $http.get('/tab/' + $scope.tabName).success(function(data) {
      var lineIndex = 1;
      var verse_tokens = data.split('\n\n');
      var verses = [];

      for (var i = 0; i < verse_tokens.length; i++) {
        var offset = 0

        var line_tokens = verse_tokens[i].split('\n');
        var lines = [];
        var j = 0;

        while (j < line_tokens.length) {
          if (line_tokens[j].trim() == "") {
            j += 1;
            continue;
          }

          if (isAnnotationLine(line_tokens[j])) {
            var data = "<div class='data'>" + annotateChords(line_tokens[j]) + "</div>";
            lines.push({id: offset + lineIndex, data: data});
            j += 1;
          } else if (isChordLine(line_tokens[j]) &&
              j + 1 < line_tokens.length &&
              line_tokens[j+1].trim() != "" &&
              !isChordLine(line_tokens[j+1])) {
            var data = joinChordWithVerse(line_tokens[j], line_tokens[j+1]);
            lines.push({id: "\n" + (offset + lineIndex), data: data});
            j += 2;
          } else if (isChordLine(line_tokens[j])) {
            var data = "<div class='data'>" + annotateChords(line_tokens[j]) + "</div>";
            lines.push({id: offset + lineIndex, data: data});
            j += 1;
          } else {
            var data = "<div class='data'>" + line_tokens[j] + "</div>";
            lines.push({id: offset + lineIndex, data: data});
            j += 1;
          }

          offset += 1;
        }

        verses.push({
          id: i,
          data: lines
        });

        lineIndex += offset;
      }

      $scope.lineCount = lineIndex;
      $scope.verses = verses;
    });
  }
]);
