'use strict';

/* Controllers */

var COMMENT = 0;
var DEFAULT = 1;
var VERSE = 2;
var VEXTAB = 3;
var ABC = 4;

var LYRIC = 0;
var SPACE = 1;

var asciiTabControllers = angular.module('asciiTabControllers', []);

var annotationPattern = /^(?:(?:\[|\()[a-zA-Z0-9,\s]+(?:\]|\))|[xX]\d+|\d+[xX]|\|)$/;

var chords = new RegExp([
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

function Chord(root, quality, over) {
  this.root = root == undefined ? '' : root;
  this.quality = quality === undefined ? '' : quality;
  this.over = over;
}

Chord.parse = function(str) {
  var tokens = str.match(new RegExp("^" + chords.source + "$"));
  return new Chord(tokens.slice(1, 3).join(''), tokens[3], tokens.slice(5, 7).join(''));
};

Chord.transposeRoot = function(root, transpose) {
  if (root == "") {
    return "";
  }

  var chordSequence = chordSequenceSharp;
  var index = chordSequence.indexOf(root);

  if (index == -1) {
    chordSequence = chordSequenceFlat;
    index = chordSequence.indexOf(root);
  }

  var nextIndex = (((index + transpose) % chordSequence.length) + chordSequence.length) % chordSequence.length;
  return chordSequence[nextIndex];
};

Chord.prototype.toString = function() {
  var result = this.root + this.quality;
  if (this.over != '') {
    result += "/" + this.over;
  }
  return result;
};

Chord.prototype.transpose = function(transpose) {
  var result = Chord.transposeRoot(this.root, transpose) + this.quality;
  if (this.over != '') {
    result += "/" + Chord.transposeRoot(this.over, transpose);
  }
  return result;
};

function parseChord(token) {
  return token.match(new RegExp('^' + chords.source + '$'));
}

function splitOnWhitespaceBoundary(line) {
  if (line.length == 0) {
    return [];
  }

  var start = 0;
  var curr = 0;
  var tokens = [];

  var space = false;
  if (line.charAt(0) == " ") {
    space = true;
  }

  while (curr < line.length) {
    if (space) {
      if (line.charAt(curr) != " ") {
        tokens.push(line.substring(start, curr));
        start = curr;
        space = false;
      }
    } else {
      if (line.charAt(curr) == " ") {
        tokens.push(line.substring(start, curr));
        start = curr;
        space = true;
      }
    }
    curr += 1;
  }

  tokens.push(line.substring(start, line.length));
  return tokens;
}

var youTubeIdPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
function parseYouTubeId(line) {
  var youTubeId = line.replace(/[\[\]\(\)]/g, '').match(youTubeIdPattern);
  if (youTubeId && youTubeId[2].length == 11) {
    return youTubeId[2];
  } else {
    return null;
  }
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
                .replace(/(?:\[[a-zA-Z0-9\.\s]+\])|(?:\s\([a-zA-Z0-9\.\s]+\))/g, '')
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

function parseSegments(line, opts) {
  return parseElements(line, opts).map(function(element) {
    return {lines: [{elements: [element]}]};
  });
}

function parseElements(string, opts) {
  // Stripped string must at least be 1 space
  string = string.replace(/\s+$/, '');
  if (string == '') {
    return [{type: 'string', data: ' '}];
  }

  var elements = [];
  var tokens = splitOnWhitespaceBoundary(string);
  var chordRegex = new RegExp(/^([\[\(]*)/.source + chords.source + /([\)\],]*)$/.source);

  opts = opts || {};
  opts.parseChord = opts.parseChord || true;

  for (var i = 0; i < tokens.length; i++) {
    var parsedChord = tokens[i].match(chordRegex);
    if (opts.parseChord && parsedChord) {
      if (parsedChord[1].length > 0) {
        elements.push({type: 'string', data: parsedChord[1]});
      }

      elements.push({
        type: 'chord',
        data: new Chord(parsedChord.slice(2, 4).join(''),
                        parsedChord[4],
                        parsedChord.slice(6, 8).join(''))
      });

      if (parsedChord.slice(-1).length > 0) {
        elements.push({type: 'string', data: parsedChord.slice(-1)});
      }
    } else {
      elements.push({type: 'string', data: tokens[i]});
    }
  }

  return elements;
}

function parseMultilineSegments(chord, verse) {
  var pos = 0;
  var segments = [];

  var curTop = '';
  var curBottom = '';

  var state = LYRIC;

  while (true) {
    var curc = pos < chord.length ? chord[pos] : ' ';
    var curv = pos < verse.length ? verse[pos] : ' ';

    if (state == LYRIC) {
      if (curc == ' ' && curv == ' ') {
        segments.push({
          lines: [
            {elements: parseElements(curTop)},
            {elements: [{type: 'string', data: curBottom}]}
          ]
        });

        state = SPACE;
        curTop = '';
        curBottom = '';

        continue;
      }
    }

    if (state == SPACE) {
      if (pos >= chord.length && pos >= verse.length) {
        break;
      }

      if (curc != ' ' || curv != ' ') {
        segments.push({
          lines: [
            {elements: [{type: 'whitespace', data: curTop.length}]},
            {elements: [{type: 'whitespace', data: curBottom.length}]}
          ]
        });

        state = LYRIC;
        curTop = '';
        curBottom = '';

        continue;
      }
    }

    curTop += curc;
    curBottom += curv;
    pos += 1;
  }

  return segments;
}

function transposeString(transpose) {
  if (transpose == 0) {
    return "--";
  } else if (transpose > 0) {
    return "+" + transpose;
  } else {
    return transpose.toString();
  }
}

asciiTabControllers.controller('tabCtrl', [
  '$rootScope', '$scope', '$document', '$http', '$routeParams', '$sce',
  '$location', 'filterFilter', 'focus',
  function($rootScope, $scope, $document, $http, $routeParams, $sce,
      $location, filterFilter, focus) {

    $http.defaults.cache = false;

    $scope.reset = function() {
      $scope.columns = 1;
      $scope.transpose = 0;
      $scope.compressToggle = true;
      $scope.youTubeToggle = false;
      $scope.bookmarksToggle = false;
      $scope.searchToggle = false;
      $scope.chordHelperToggle = true;
      $scope.visibleLock = false;
      $scope.scale = 1;

      if ($scope.capoPosition == undefined) {
        $scope.secondTranspose = 0;
      } else {
        $scope.secondTranspose = $scope.capoPosition;
      }
    };

    $scope.renderHtml = function(html_code) {
      return $sce.trustAsHtml(html_code);
    };

    $scope.youTubeEmbedUrl = function() {
      var url = "http://www.youtube.com/embed/" + $scope.youTubeId + "?rel=0&autoplay=1";
      return $sce.trustAsResourceUrl(url);
    };

    $scope.transposeString = function() {
      var result = transposeString($scope.transpose);
      if ($scope.secondTranspose != $scope.transpose) {
        result += "(" + transposeString($scope.secondTranspose) + ")";
      }
      return result;
    };

    $scope.transposeReset = function() {
      $scope.transpose = 0;
      $scope.secondTranspose = 0;
    };

    $scope.setTranspose = function(transpose) {
      $scope.transpose = transpose;
    };

    $scope.transposeUp = function() {
      $scope.transpose = ($scope.transpose + 1) % 12;
      $scope.transposeSecondaryUp();
    };

    $scope.transposeDown = function() {
      $scope.transpose = ($scope.transpose - 1) % -12;
      $scope.transposeSecondaryDown();
    };

    $scope.transposeSecondaryUp = function() {
      $scope.secondTranspose = ($scope.secondTranspose + 1) % 12;
    };

    $scope.transposeSecondaryDown = function() {
      $scope.secondTranspose = ($scope.secondTranspose - 1) % -12;
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

    $scope.fontSizeUp = function() {
      if ($scope.scale < 2) {
        $scope.scale = Math.round($scope.scale * 100 + 5) / 100;
      }
    };

    $scope.fontSizeDown = function() {
      if ($scope.scale > 0.5) {
        $scope.scale = Math.round($scope.scale * 100 - 5) / 100;
      }
    };

    $scope.openEditor = function() {
      $http.post('/tab/' + $scope.tabName + '/edit', {});
    };

    $scope.toggleSearch = function() {
      if ($scope.searchToggle) {
        $scope.closeSearch();
      } else {
        $scope.openSearch();
      }
    };

    $scope.openSearch = function() {
      $scope.searchToggle = true;
      $scope.visibleLock = true;
      focus('searchToggle');
    };

    $scope.closeSearch = function() {
      $scope.searchToggle = false;
      $scope.visibleLock = false;
      $scope.query = "";
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
      $scope.compressToggle = !$scope.compressToggle;
    };

    $scope.renderVextab = function(code) {
      try {
        // Parse VexTab music notation
        var container = document.createElement('div');
        var expectedWidth = window.innerWidth / $scope.columns - 70;
        var artist = new Artist(10, 10, expectedWidth, {scale: $scope.scale});
        var vextab = new VexTab(artist);
        var renderer = new Vex.Flow.Renderer(container, Vex.Flow.Renderer.Backends.RAPHAEL);

        vextab.parse(code);
        artist.render(renderer);

        return container.outerHTML;
      } catch (e) {
        console.log(e);
      }
    };

    $scope.renderAbc = function(code) {
      try {
        // Parse AbcJs music notation
        var container = document.createElement('div');
        ABCJS.renderAbc(container, code, {}, {
          'staffwidth': (window.innerWidth / $scope.columns) / $scope.scale - 70,
          'scale': $scope.scale, 'paddingright': 1, 'paddingleft': 1, 'paddingbottom': -30});

        return container.outerHTML;
      } catch (e) {
        console.log(e);
      }
    };

    $scope.renderGuitarChord = function(chord) {
      $scope.chordHelperToggle = true;
      jtab.render($('.chord-helper .content'), chord);
    };

    $scope.whitespace = function(size) {
      if ($scope.compressToggle) {
        return ' ';
      } else {
        return new Array(size + 1).join(' ');
      }
    };

    // Remove keydown binding on scope $destroy()
    $scope.$on('$destroy', function() {
      console.log("Destroying ", $scope);
      $document.unbind('keydown');
    });

    // Add keydown binding on scope create.
    $document.bind('keydown', function(e) {
      console.log(e);

      if ($('.search-panel .search-box input').is(":focus")) {
        if (!e.metaKey && !e.altKey && !e.shiftKey && !e.ctrlKey) {
          if (e.keyCode == 27) {
            // Close search result on escape
            $scope.closeSearch();
            e.preventDefault();
          } else if (e.keyCode == 13) {
            // Open first search result on enter/return
            $scope.openFirstSearchResult();
            e.preventDefault();
          }
        }

        return;
      }

      if (!e.metaKey && !e.altKey && !e.shiftKey && !e.ctrlKey) {
        if (e.keyCode == 27) {
          // Reset everything on escape
          $scope.reset();
          e.preventDefault();
        } else if (e.keyCode >= 49 && e.keyCode <= 53) {
          // Change number of columns on number
          $scope.columns = e.keyCode - 48;
          e.preventDefault();
        } else if (e.keyCode == 187) {
          // Increase font size on =
          $scope.fontSizeUp();
          e.preventDefault();
        } else if (e.keyCode == 189) {
          // Decrease font size on -
          $scope.fontSizeDown();
          e.preventDefault();
        } else if (e.keyCode == 38) {
          // Transpose up on up arrow
          $scope.transposeUp();
          e.preventDefault();
        } else if (e.keyCode == 40) {
          // Transpose down on down arrow
          $scope.transposeDown();
          e.preventDefault();
        } else if (e.keyCode == 191) {
          // Open search on /
          $scope.openSearch();
          e.preventDefault();
        }
      } else if (!e.metaKey && !e.altKey && e.shiftKey && !e.ctrlKey) {
        if (e.keyCode == 38) {
          // Transpose secondary up on shift + up arrow
          $scope.transposeSecondaryUp();
          e.preventDefault();
        } else if (e.keyCode == 40) {
          // Transpose secondary down on shift + down arrow
          $scope.transposeSecondaryDown();
          e.preventDefault();
        }
      } else if (!e.metaKey && e.altKey && !e.shiftKey && !e.ctrlKey) {
        // Transpose up on option + number
        if (e.keyCode >= 48 && e.keyCode <= 57) {
          $scope.setTranspose(e.keyCode - 48);
          e.preventDefault();
        }
      } else if (!e.metaKey && e.altKey && e.shiftKey && !e.ctrlKey) {
        // Transpose down on option + shift + number
        if (e.keyCode >= 48 && e.keyCode <= 57) {
          $scope.setTranspose(48 - e.keyCode);
          e.preventDefault();
        }
      }

      $scope.$apply();
    });

    $scope.reset();

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
        $scope.parsedData = {};
        $scope.parsedData.verses = [];

        var lineTokens = tabData.replace(/\t/g, '        ').split('\n');

        var currentVerse = null;
        var currentLine = null;

        var lineIndex = 1;
        var inlineCode = null;
        var state = DEFAULT;

        var i = 0;
        while (i < lineTokens.length) {
          if (state == DEFAULT) {
            if (lineTokens[i].trim() == "") {
              i += 1;
              continue;
            }

            // Do not consume the token: use it as part of the VERSE state
            currentVerse = {};
            $scope.parsedData.verses.push(currentVerse);
            currentVerse.lines = [];

            state = VERSE;
            continue;
          }

          if (state == VEXTAB) {
            if (lineTokens[i] == '```') {
              currentLine.data = inlineCode.join('');
              currentLine = null;
              currentVerse = null;

              inlineCode = null;
              state = VERSE;
              i += 1;
              continue;
            }

            inlineCode.push(lineTokens[i] + "\n");
            i += 1;
            continue;
          }

          if (state == ABC) {
            if (lineTokens[i] == '```') {
              currentLine.data = inlineCode.join('');
              currentLine = null;
              currentVerse = null;

              inlineCode = null;
              state = VERSE;
              i += 1;
              continue;
            }

            inlineCode.push(lineTokens[i] + "\n");
            i += 1;
            continue;
          }

          // Don't render code between ``` tokens
          if (state == COMMENT) {
            if (lineTokens[i] == '```') {
              state = VERSE;
              i += 1;
              continue;
            }

            console.log(lineTokens[i]);
            i += 1;
            continue;
          }

          if (state == VERSE) {
            // Split up verses
            if (lineTokens[i].trim() == "") {
              currentVerse = null;
              state = DEFAULT;
              i += 1;
              continue;
            }

            // Do not render YouTube URL
            var youTubeId = parseYouTubeId(lineTokens[i]);
            if (youTubeId) {
              $scope.youTubeId = youTubeId;
              i += 1;
              continue;
            }

            // Detect capo
            var capo = lineTokens[i].match(/capo\s+(?:on)?\s*(\d{1,2})/i);
            if (capo != null) {
              $scope.capoPosition = Number(capo[1]);
              i += 1;
              continue;
            }

            if (lineTokens[i] == '```') {
              state = COMMENT;
              i += 1;
              continue;
            }

            if (lineTokens[i] == '```vextab') {
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;
              currentLine.type = 'vextab';

              inlineCode = [];
              state = VEXTAB;
              i += 1;
              continue;
            }

            if (lineTokens[i] == '```abc') {
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;
              currentLine.type = 'abc';

              inlineCode = [];
              state = ABC;
              i += 1;
              continue;
            }

            if (isAnnotationLine(lineTokens[i])) {
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;
              currentLine.type = 'segments';
              currentLine.segments = parseSegments(lineTokens[i]);

              i += 1;
              lineIndex += 1;
              continue;
            }

            if (isChordLine(lineTokens[i]) &&
                i + 1 < lineTokens.length &&
                lineTokens[i+1].trim() != "" &&
                !isChordLine(lineTokens[i+1])) {
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;
              currentLine.type = 'segments';
              currentLine.segments = parseMultilineSegments(lineTokens[i], lineTokens[i+1]);

              i += 2;
              lineIndex += 1;
              continue;
            }

            if (isChordLine(lineTokens[i])) {
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;
              currentLine.type = 'segments';
              currentLine.segments = parseSegments(lineTokens[i]);

              i += 1;
              lineIndex += 1;
              continue;
            }


            currentLine = {};
            currentVerse.lines.push(currentLine);
            currentLine.gutter = lineIndex;
            currentLine.type = 'segments';
            currentLine.segments = parseSegments(lineTokens[i], {parseChords: false});

            i += 1;
            lineIndex += 1;
          }
        }

        $scope.reset();
        console.log($scope.parsedData);
      });
    }
  }
]);
