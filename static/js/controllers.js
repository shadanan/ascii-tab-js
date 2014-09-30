'use strict';

/* Controllers */

var asciiTabControllers = angular.module('asciiTabControllers', []);

var annotationPattern = /^(?:(?:\[|\()[a-zA-Z0-9,\s]+(?:\]|\))|[xX]\d+|\d+[xX]|\|)$/;

var chords = RegExp([
  '([CDEFGAB])',
  '(#|##|b|bb)?',
  '(',
    'maj|maj7|maj9|maj11|maj13|maj9#11|maj13#11|add9|maj7b5|maj7#5|',
    'm|m7|m9|m11|m13|m6|',
    'madd9|m\\(add9\\)|m6add9|m6\\(add9\\)|m7add9|m7\\(add9\\)|',
    'mmaj7|m\\(maj7\\)|mmaj9|m\\(maj9\\)|m7b5|m7#5|',
    '5|',
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
].join(''));

var spacer = "<div class='spacer'><div> </div><div> </div></div>";

var chordSequenceSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
var chordSequenceFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function parseChord(token) {
  return token.match(RegExp('^' + chords.source + '$'));
}

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

    if (parseChord(tokens[i])) {
      continue;
    }

    return false;
  }

  return true;
}

function transposeChordName(chordName, transpose) {
  if (chordName == "") {
    return "";
  }

  var chordSequence = chordSequenceSharp;
  var index = chordSequence.indexOf(chordName);

  if (index == -1) {
    chordSequence = chordSequenceFlat;
    index = chordSequence.indexOf(chordName);
  }

  var nextIndex = (((index + transpose) % chordSequence.length) + chordSequence.length) % chordSequence.length;
  return chordSequence[nextIndex];
}

function transposeChord(chord, transpose) {
  var transposedChord = [];

  var chordName = chord.slice(0, 2).join('');
  transposedChord.push(transposeChordName(chordName, transpose));

  transposedChord.push(chord[2]);

  if (chord[3] == '/') {
    var bassChordName = chord.slice(4, 6).join('');
    transposedChord.push('/');
    transposedChord.push(transposeChordName(bassChordName, transpose));
  }

  return transposedChord.join('');
}

function annotateChords(line, transpose) {
  transpose = typeof transpose !== 'undefined' ? transpose : 0;

  var result = []
  var tokens = line.split(/ /);

  for (var i = 0; i < tokens.length; i++) {
    var start = /^([\[\(]*)/;
    var end = /([\)\],]*)$/;

    var parsedChord = tokens[i].match(RegExp(start.source + chords.source + end.source));
    if (parsedChord) {
      result.push([
          parsedChord[1],
          "<span class='chord'>",
          transposeChord(parsedChord.slice(2, -1), transpose),
          "</span>",
          parsedChord.slice(-1)
        ].join(''));
    } else {
      result.push(tokens[i]);
    }
  }

  return result.join(' ');
}

function renderToken(chord, lyric, transpose) {
  return "<div class='lyric'>" +
    "<div>" + annotateChords(chord, transpose) + "</div>" +
    "<div>" + lyric + "</div></div>";
}

function joinChordWithVerse(chord, verse, transpose, compress) {
  var pos = 0;
  var divs = [];

  var curTop = "";
  var curBottom = "";

  var last_token_was_spacer = false;

  while (pos < chord.length || pos < verse.length) {
    var curc = pos < chord.length ? chord[pos] : ' ';
    var curv = pos < verse.length ? verse[pos] : ' ';

    if (curc == ' ' && curv == ' ') {
      if (!compress || !last_token_was_spacer) {
        divs.push(renderToken(curTop, curBottom, transpose));
        divs.push(spacer);
        curTop = "";
        curBottom = "";
        last_token_was_spacer = true;
      }
    } else {
      curTop += curc;
      curBottom += curv;
      last_token_was_spacer = false;
    }

    pos += 1;
  }

  if (curTop != "" || curBottom != "") {
    divs.push(renderToken(curTop, curBottom, transpose));
  }

  return divs.join("");
}

function renderTab($scope) {

  // <div class="verse" ng-repeat="verse in verses">
  //   <div class="line" ng-repeat="line in verse.data">
  //     <div class="content" ng-bind-html="renderHtml(line.data)"></div>
  //   </div>
  // </div>

  var lineIndex = 1;
  var verse_tokens = $scope.tabData.replace(/\t/g, '        ').split('\n\n');
  var html = [];

  for (var i = 0; i < verse_tokens.length; i++) {
    var offset = 0

    var line_tokens = verse_tokens[i].split('\n');
    var j = 0;

    html.push("<div class='verse'>");
    while (j < line_tokens.length) {
      if (line_tokens[j].trim() == "") {
        j += 1;
        continue;
      }

      html.push("<div class='line'>");
      if (isAnnotationLine(line_tokens[j])) {
        html.push("<div class='gutter'>" + (offset + lineIndex) + "</div>");
        html.push("<div class='data'>" + annotateChords(line_tokens[j], $scope.transpose) + "</div>");
        j += 1;
      } else if (isChordLine(line_tokens[j]) &&
          j + 1 < line_tokens.length &&
          line_tokens[j+1].trim() != "" &&
          !isChordLine(line_tokens[j+1])) {
        html.push("<div class='gutter'>\n" + (offset + lineIndex) + "</div>");
        html.push(joinChordWithVerse(line_tokens[j], line_tokens[j+1], $scope.transpose, $scope.compress));
        j += 2;
      } else if (isChordLine(line_tokens[j])) {
        html.push("<div class='gutter'>" + (offset + lineIndex) + "</div>");
        html.push("<div class='data'>" + annotateChords(line_tokens[j], $scope.transpose) + "</div>");;
        j += 1;
      } else {
        html.push("<div class='gutter'>" + (offset + lineIndex) + "</div>");
        html.push("<div class='data'>" + line_tokens[j] + "</div>");
        j += 1;
      }

      html.push("</div>");
      offset += 1;
    }

    html.push("</div>");
    lineIndex += offset;
  }

  $scope.html = html.join('');
}

asciiTabControllers.controller('tabCtrl', [
  '$rootScope', '$scope', '$document', '$http', '$routeParams', '$sce',
  '$location', 'filterFilter',
  function($rootScope, $scope, $document, $http, $routeParams, $sce,
      $location, filterFilter) {

    $http.defaults.cache = false;

    $scope.renderHtml = function(html_code) {
      return $sce.trustAsHtml(html_code);
    };

    $scope.transposeString = function() {
      if ($scope.transpose == 0) {
        return "--";
      } else if ($scope.transpose > 0) {
        return "+" + $scope.transpose;
      } else {
        return $scope.transpose;
      }
    };

    $scope.transposeReset = function() {
      $scope.transpose = 0;
      renderTab($scope);
    };

    $scope.transposeUp = function() {
      $scope.transpose = ($scope.transpose + 1) % 12;
      renderTab($scope);
    };

    $scope.transposeDown = function() {
      $scope.transpose -= 1;
      if ($scope.transpose == -12) {
        $scope.transpose = 0;
      }
      renderTab($scope);
    };

    $scope.columnsUp = function() {
      if ($scope.columns < 5) {
        $scope.columns += 1;
      }
    };

    $scope.columnsDown = function() {
      if ($scope.columns > 1) {
        $scope.columns -= 1;
      }
    };

    $scope.fontSizeReset = function() {
      $scope.fontSize = 100;
      $('.tab').css('font-size', $scope.fontSize/100 + "em");
    };

    $scope.fontSizeUp = function() {
      if ($scope.fontSize >= 200) {
        return;
      }

      $scope.fontSize += 5;
      $('.tab').css('font-size', $scope.fontSize/100 + "em");
    };

    $scope.fontSizeDown = function() {
      if ($scope.fontSize <= 50) {
        return;
      }

      $scope.fontSize -= 5;
      $('.tab').css('font-size', $scope.fontSize/100 + "em");
    };

    $scope.fontSizeString = function() {
      return ($scope.fontSize / 100).toFixed(2);
    };

    $scope.openEditor = function() {
      $http.post('/tab/' + $scope.tabName + '/edit');
    };

    $scope.openSearch = function() {
      $('.search-panel').show();
      $('.search-panel .search-box input').focus();
    };

    $scope.closeSearch = function() {
      $('.controls').removeClass('visible');
      $('.search-panel').hide();
    };

    $scope.openBookmarks = function() {
      $('.bookmark-panel').show();
    };

    $scope.closeBookmarks = function() {
      $('.bookmark-panel').hide();
    };

    $scope.openFirstSearchResult = function() {
      var filteredTabs = filterFilter($scope.tabs, $scope.query);

      if (filteredTabs.length > 0) {
        var firstTab = filteredTabs[0];
        $location.path('/tab/' + firstTab.name);
        $rootScope.$apply();
        $scope.closeSearch();
      }
    };

    $scope.toggleCompress = function() {
      $scope.compress = !$scope.compress;
      renderTab($scope);
    }

    $('.search-panel .search-box input')
      .focusin(function() {
        $('.controls').addClass('visible');
      })
      .focusout(function() {
        $('.controls').removeClass('visible');
      });

    $scope.$on('$destroy', function () {
      console.log("Destroying ", $scope);
      $document.unbind('keydown');
    });

    $document.bind('keydown', function(e) {
      console.log(e);

      if ($('.search-panel .search-box input').is(":focus")) {
        if (!e.metaKey && !e.altKey && !e.shiftKey && !e.ctrlKey) {
          if (e.keyCode == 27) {
            $scope.closeSearch();
            e.preventDefault();
          } else if (e.keyCode == 13) {
            $scope.openFirstSearchResult();
            e.preventDefault;
          }
        }

        return;
      }

      if (!e.metaKey && !e.altKey && !e.shiftKey && !e.ctrlKey) {
        if (e.keyCode >= 49 && e.keyCode <= 53) {
          $scope.columns = e.keyCode - 48;
          e.preventDefault();
        } else if (e.keyCode == 187) {
          $scope.fontSizeUp();
          e.preventDefault();
        } else if (e.keyCode == 189) {
          $scope.fontSizeDown();
          e.preventDefault();
        } else if (e.keyCode == 38) {
          $scope.transposeUp();
          e.preventDefault();
        } else if (e.keyCode == 40) {
          $scope.transposeDown();
          e.preventDefault();
        } else if (e.keyCode == 191) {
          $scope.openSearch();
          e.preventDefault();
        }
      }

      $scope.$apply();
    });

    $scope.columns = 1;
    $scope.transpose = 0;
    $scope.compress = true;
    $scope.fontSizeReset();

    $http.get('/tab').success(function(data) {
      $scope.tabs = data;
    });

    $http.get('/bookmarks').success(function(data) {
      $scope.bookmarks = data;
    });

    if ($routeParams.tabName == undefined) {
      $rootScope.title = 'AsciiTabJS';
      $scope.openSearch();
    } else {
      $rootScope.title = $routeParams.tabName + ' - AsciiTabJS';
      $scope.tabName = $routeParams.tabName;

      $http.get('/tab/' + $scope.tabName).success(function(tabData) {
        $scope.tabData = tabData;
        renderTab($scope)
      });
    }
  }
]);
