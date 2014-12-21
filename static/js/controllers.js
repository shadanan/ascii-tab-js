'use strict';

/* Controllers */

var DEFAULT = 0;
var VERSE = 1;
var VEXTAB = 2;
var ABC = 3;

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

function renderGuitarChord(chord) {
  jtab.render($('.chord-helper .content'), chord);
}

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

function annotateChords(line, transpose, secondTranspose) {
  transpose = typeof transpose !== 'undefined' ? transpose : 0;

  var result = [];
  var tokens = splitOnWhitespaceBoundary(line);

  for (var i = 0; i < tokens.length; i++) {
    var start = /^([\[\(]*)/;
    var end = /([\)\],]*)$/;

    var parsedChord = tokens[i].match(new RegExp(start.source + chords.source + end.source));
    if (parsedChord) {
      var chordSpan = [];
      chordSpan.push(parsedChord[1]);

      var chordName = transposeChord(parsedChord.slice(2, -1), transpose);
      chordSpan.push("<span class='chord-primary' onclick='renderGuitarChord(\"" + chordName + "\")'>");
      chordSpan.push(chordName);
      chordSpan.push("</span>");

      if (secondTranspose != transpose) {
        chordSpan.push("(<span class='chord-secondary'>");
        chordSpan.push(transposeChord(parsedChord.slice(2, -1), secondTranspose));
        chordSpan.push("</span>)");
      }
      chordSpan.push(parsedChord.slice(-1));
      result.push(chordSpan.join(''));
    } else {
      result.push(tokens[i]);
    }
  }

  result = result.join(' ').replace(/\s+$/, '');
  return result != "" ? result : " ";
}

function renderLineTokens(line) {
  var result = [];
  var tokens = line.split(/\b/);

  for (var i = 0; i < tokens.length; i++) {
    result.push("<div class='token'>");
    result.push(tokens[i]);
    result.push("</div>");
  }

  return result.join("");
}

function renderChordLyricToken(chord, lyric, transpose, secondTranspose) {
  return "<div class='lyric'>" +
    "<div class='chord-line'>" + annotateChords(chord, transpose, secondTranspose) + "</div>" +
    "<div class='lyric-line'>" + lyric + "</div></div>";
}

function joinChordWithVerse(chord, verse, transpose, secondTranspose, compress) {
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
        divs.push(renderChordLyricToken(curTop, curBottom, transpose, secondTranspose));
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
    divs.push(renderChordLyricToken(curTop, curBottom, transpose, secondTranspose));
  }

  return divs.join("");
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

    $scope.extractAnnotations = function() {
      $scope.lineTokens = $scope.tabData.replace(/\t/g, '        ').split('\n');
      $scope.lineCount = $scope.lineTokens.length;

      for (var i = 0; i < $scope.lineTokens.length; i++) {
        if ($scope.lineTokens[i].trim() == "") {
          continue;
        }

        var youTubeId = parseYouTubeId($scope.lineTokens[i]);
        if (youTubeId) {
          $scope.youTubeId = youTubeId;
          continue;
        }

        var capo = $scope.lineTokens[i].match(/capo\s+(?:on)?\s*(\d{1,2})/i);
        if (capo != null) {
          $scope.capoPosition = Number(capo[1]);
          continue;
        }
      }
    };

    $scope.renderTab = function() {};

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
      $scope.renderTab();
    };

    $scope.setTranspose = function(transpose) {
      $scope.transpose = transpose;
      $scope.renderTab();
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
      $scope.renderTab();
    };

    $scope.transposeSecondaryDown = function() {
      $scope.secondTranspose = ($scope.secondTranspose - 1) % -12;
      $scope.renderTab();
    };

    $scope.columnsUp = function() {
      if ($scope.columns < 5) {
        $scope.columns += 1;
      }
      $scope.renderTab();
    };

    $scope.columnsDown = function() {
      if ($scope.columns > 1) {
        $scope.columns -= 1;
      }
      $scope.renderTab();
    };

    $scope.fontSizeUp = function() {
      if ($scope.scale < 2) {
        $scope.scale = Math.round($scope.scale * 100 + 5) / 100;
      }
      $scope.renderTab();
    };

    $scope.fontSizeDown = function() {
      if ($scope.scale > 0.5) {
        $scope.scale = Math.round($scope.scale * 100 - 5) / 100;
      }
      $scope.renderTab();
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
      $scope.renderTab();
    };

    $scope.renderGuitarChord = function (chord) {
      $scope.chordHelperToggle = true;
      jtab.render($('.chord-helper .content'), chord);
    };

    // Remove keydown binding on scope $destroy()
    $scope.$on('$destroy', function () {
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
          $scope.renderTab();
        } else if (e.keyCode >= 49 && e.keyCode <= 53) {
          // Change number of columns on number
          $scope.columns = e.keyCode - 48;
          e.preventDefault();
          $scope.renderTab();
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
        $scope.tabData = tabData;
        $scope.extractAnnotations();
        $scope.reset();

        $scope.renderTab = function() {
          $scope.parsedData = {};
          $scope.parsedData.verses = [];
          var currentVerse = null;
          var currentLine = null;

          var lineIndex = 1;
          var html = [];
          var inlineCode = null;
          var state = DEFAULT;

          var i = 0;
          while (i < $scope.lineTokens.length) {

            if ($scope.lineTokens[i] == '```vextab') {
              if (state == VERSE) {
                html.push("</div>"); // End verse
              }

              currentVerse = {};
              $scope.parsedData.verses.push(currentVerse);
              currentVerse.type = 'vextab';
              currentVerse.lines = [];
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;

              html.push("<div class='verse'>");
              html.push("<div class='line'>");
              html.push("<div class='gutter'>" + lineIndex + "</div>");
              inlineCode = [];
              state = VEXTAB;
              i += 1;
              continue;
            }

            if ($scope.lineTokens[i] === '```abcjs') {
              if (state == VERSE) {
                html.push("</div>"); // End verse
              }

              currentVerse = {};
              $scope.parsedData.verses.push(currentVerse);
              currentVerse.type = 'abcjs';
              currentVerse.lines = [];
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;

              html.push("<div class='verse'>");
              html.push("<div class='line'>");
              html.push("<div class='gutter'>" + lineIndex + "</div>");
              inlineCode = [];
              state = ABC;
              i += 1;
              continue;
            }


            if (state == DEFAULT) {
              if ($scope.lineTokens[i].trim() == "") {
                i += 1;
                continue;
              }

              // Do not consume the token: use it as part of the VERSE state
              currentVerse = {};
              $scope.parsedData.verses.push(currentVerse);
              currentVerse.type = 'verse';
              currentVerse.lines = [];

              html.push("<div class='verse'>");
              state = VERSE;
              continue;
            }

            if (state == VEXTAB) {
              if ($scope.lineTokens[i] == '```') {
                try {
                  // Parse VexTab music notation
                  var expectedWidth = window.innerWidth / $scope.columns - 70;
                  var artist = new Artist(10, 10, expectedWidth, {scale: $scope.scale});
                  var vextab = new VexTab(artist);
                  var vextabContainer = document.createElement('div');
                  var renderer = new Vex.Flow.Renderer(vextabContainer,
                      Vex.Flow.Renderer.Backends.RAPHAEL);

                  vextab.parse(inlineCode.join(''));
                  artist.render(renderer);
                  html.push(vextabContainer.outerHTML);

                  currentLine.data = inlineCode.join('');
                  currentLine.html = vextabContainer.outerHTML;
                } catch (e) {
                  console.log(e);
                  html.push(e);
                }

                currentLine = null;
                currentVerse = null;

                html.push("</div>"); // line
                html.push("</div>"); // verse
                inlineCode = null;
                state = DEFAULT;
                i += 1;
                continue;
              }

              inlineCode.push($scope.lineTokens[i] + "\n");
              i += 1;
              continue;
            }

            if (state == ABC) {
              if ($scope.lineTokens[i] == '```') {
                try {
                  // Parse AbcJs music notation
                  var abcContainer = document.createElement('div');
                  ABCJS.renderAbc(abcContainer, inlineCode.join(''), {}, {
                    'staffwidth': (window.innerWidth / $scope.columns) / $scope.scale - 70,
                    'scale': $scope.scale, 'paddingright': 1, 'paddingleft': 1});
                  html.push(abcContainer.outerHTML);

                  currentLine.data = inlineCode.join('');
                  currentLine.html = abcContainer.outerHTML;
                } catch (e) {
                  console.log(e);
                  html.push(e);
                }

                currentLine = null;
                currentVerse = null;

                html.push("</div>"); // line
                html.push("</div>"); // verse
                inlineCode = null;
                state = DEFAULT;
                i += 1;
                continue;
              }

              inlineCode.push($scope.lineTokens[i] + "\n");
              i += 1;
              continue;
            }

            if (state == VERSE) {
              // Split up verses
              if ($scope.lineTokens[i].trim() == "") {
                html.push("<div class='line'><div class='gutter'> </div></div>");

                currentVerse = null;

                html.push("</div>"); // End verse
                state = DEFAULT;
                i += 1;
                continue;
              }

              // Do not render YouTube URL
              var youTubeId = parseYouTubeId($scope.lineTokens[i]);
              if (youTubeId) {
                i += 1;
                continue;
              }

              if (isAnnotationLine($scope.lineTokens[i])) {
                currentLine = {};
                currentVerse.lines.push(currentLine);
                currentLine.gutter = lineIndex;
                currentLine.type = 'annotation-line';
                currentLine.html = annotateChords($scope.lineTokens[i],
                                                  $scope.transpose, $scope.secondTranspose);

                html.push("<div class='line'>");
                html.push("<div class='gutter'>" + lineIndex + "</div>");
                html.push("<div class='content annotation-line'>");
                html.push(annotateChords($scope.lineTokens[i],
                                         $scope.transpose, $scope.secondTranspose));
                html.push("</div>");
                html.push("</div>");
                i += 1;
                lineIndex += 1;
                continue;
              }

              if (isChordLine($scope.lineTokens[i]) &&
                  i + 1 < $scope.lineTokens.length &&
                  $scope.lineTokens[i+1].trim() != "" &&
                  !isChordLine($scope.lineTokens[i+1])) {
                currentLine = {};
                currentVerse.lines.push(currentLine);
                currentLine.gutter = lineIndex;
                currentLine.type = 'lyric-line';
                currentLine.html = joinChordWithVerse($scope.lineTokens[i], $scope.lineTokens[i+1], 
                                                      $scope.transpose, $scope.secondTranspose, $scope.compressToggle);

                html.push("<div class='line'>");
                html.push("<div class='gutter'>\n" + lineIndex + "</div>");
                html.push("<div class='content lyric-line'>");
                html.push(joinChordWithVerse($scope.lineTokens[i], $scope.lineTokens[i+1], 
                                             $scope.transpose, $scope.secondTranspose, $scope.compressToggle));
                html.push("</div>");
                html.push("</div>");
                i += 2;
                lineIndex += 1;
                continue;
              }

              if (isChordLine($scope.lineTokens[i])) {
                currentLine = {};
                currentVerse.lines.push(currentLine);
                currentLine.gutter = lineIndex;
                currentLine.type = 'chord-line';
                currentLine.html = annotateChords($scope.lineTokens[i], 
                                                  $scope.transpose, $scope.secondTranspose);

                html.push("<div class='line'>");
                html.push("<div class='gutter'>" + lineIndex + "</div>");
                html.push("<div class='content chord-line'>");
                html.push(annotateChords($scope.lineTokens[i], 
                                         $scope.transpose, $scope.secondTranspose));
                html.push("</div>");
                html.push("</div>");
                i += 1;
                lineIndex += 1;
                continue;
              }
              
              currentLine = {};
              currentVerse.lines.push(currentLine);
              currentLine.gutter = lineIndex;
              currentLine.type = 'text-line';
              currentLine.html = renderLineTokens($scope.lineTokens[i]);

              html.push("<div class='line'>");
              html.push("<div class='gutter'>" + lineIndex + "</div>");
              html.push("<div class='content text-line'>");
              html.push(renderLineTokens($scope.lineTokens[i]));
              html.push("</div>");
              html.push("</div>");
              i += 1;
              lineIndex += 1;
            }
          }

          // html.push("</div>"); // column
          $scope.html = html.join('');

          console.log($scope.parsedData);
        };

        $scope.renderTab();
      });
    }
  }
]);
