/**
 * MIT License
 *
 * Copyright (c) 2017-2018 SILENT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
;( function ( $, window, undefined ) {

'use strict';

if ( 'serviceWorker' in navigator ) {
  navigator.serviceWorker.register( 'service-worker.js' )
    .then( function ( registration ) {
      console.log( 'Registration succeeded. Scope is ' + registration.scope );
    }, function ( ex ) {
      console.log( 'Registration failed with ' + ex );
    } );
}

// config the mathjs
math.config( {
  number: 'BigNumber',
  precision: 16
} );

var util = {
  // count substr in the string
  count: function ( string, substr, overlapping ) {
    string += '';
    substr += '';

    // regexp behaviour
    if ( substr.length <= 0 ) {
      return string.length + 1;
    }

    var count = 0,
        index = 0,
        step = overlapping ? 1 : substr.length;

    for ( ; ~( index = string.indexOf( substr, index ) ); ++count, index += step );

    return count;
  },

  // access to the last element of an iterable
  last: function ( iterable, value ) {
    return util.nth( iterable, -1, value );
  },

  nth: function ( iterable, i, value ) {
    i = iterable.length && ( i < 0 ? iterable.length + i : i );

    return value !== undefined ?
      iterable[ i ] = value : iterable[ i ];
  }
};

var memory = {
  // returns the last value of memory.values
  getLastValue: function ( last ) {
    return this.values.length && ( table[ last = util.last( this.values ) ] || !last.indexOf( last = 'root(' ) ) ? last : null;
  },

  // updates memory.current
  update: function () {
    var data = this.getLastValue(),
        match;

    if ( data ) {
      data = table[ data ];
    }

    if ( data ) {
      if ( data.hooks && data.hooks.update ) {
        data.hooks.update();
      } else if ( this.values.length &&
        ( match = this.values.join( '' ).match( /(?:,-|\(-|^-)?(\d+(?:\.(?:$|\d+))?(?:e(?:[+-]?(?:$|\d+))?)?)$|(?:,-|\(-|^-)$/ ) ) )
      {
        match = match[ 0 ];
        data = match.charAt( 0 );
        this.current = data === '(' || data === ',' ? match.slice( 1 ) : match;
        match = util.last( this.current );
        this.last = this.current === '-' ? 'number' : table[ match ].type;
      } else {
        this.current = '';
        this.last = data.type;
      }
    } else {
      this.current = '';
      this.last = 'none';
    }
  },

  // puts values to both memory.values and
  // memory.display with replacing to the notation
  push: function () {
    $.merge( this.values, arguments );
    $.merge( this.display, $.map( arguments, map, table ) );
    return this;
  },

  last: 'none',
  angles: 'deg',
  memory: '0',
  current: '',
  preview: '',
  calculated: '',
  values: [],
  display: [],
  valid: false,
  round: 6,

  roots: {
    values: [],
    display: []
  }
};

var calculate = function ( raw ) {
  if ( !raw || '+-*/^('.indexOf( util.last( raw ) ) >= 0 ) {
    return false;
  }

  if ( raw.indexOf( '(' ) >= 0 ) {
    // we need to add missing brackets
    var opened = util.count( raw, '(' ),
        closed = util.count( raw, ')' );

    for ( ; opened > closed; ++closed ) {
      raw += ')';
    }
  }

  try {
    raw = math[ 'eval' ]( raw );
  } catch ( ex ) {
    return false;
  }

  raw = '' + ( memory.round === null ?
    raw : math.round( raw, memory.round ) );

  while ( ~raw.indexOf( ' ' ) ) {
    raw = raw.replace( ' ', '' );
  }

  return raw;
};

var update = function () {
  var values = [
    '0', '1', '2', '3', '4',
    '5', '6', '7', '8', '9',
    ')', 'pi', 'phi', 'e', '^2', 'Infinity', 'NaN', '!'
  ];

  var search = function ( value ) {
    return $.lastIndexOf( this, value ) >= 0;
  };

  return function () {
    // cut raw to the last number/bracket/constant
    // for correct calculated result
    var index = $.findLastIndex( memory.values, search, values ),
        raw = memory.values.slice( 0, index + 1 ).join( '' ),
        calculated = calculate( raw );

    if ( ( memory.valid = calculated !== false ) ) {
      memory.calculated = calculated;
      memory.preview = toStyle( calculated );
    } else if ( index < 0 ) {
      memory.calculated = memory.preview = '';
    }
  };
}();

var render = function () {
  var step = 2,
      display = $display[ 0 ],
      current = window.parseInt( $.style( display, 'font-size' ), 10 ),
      raw, result, opened, closed;

  if ( memory.display.length ) {
    raw = memory.values.join( '' );
    result = memory.display.join( '' );

    if ( raw.indexOf( '(' ) >= 0 && ( opened = util.count( raw, '(' ) ) > ( closed = util.count( raw, ')' ) ) ) {
      result += '<span class="placeholder">';

      for ( ; opened > closed; ++closed ) {
        result += table[ ')' ].notation;
      }

      result += '</span>';
    }

    $display.removeClass( 'placeholder' )[ result.indexOf( '<' ) < 0 ? 'text' : 'html' ]( result );
  } else {
    $display.addClass( 'placeholder' ).text( '0' );
  }

  if ( memory.display.length && memory.preview ) {
    $preview.removeClass( 'placeholder' )[ memory.preview.indexOf( '<' ) < 0 ? 'text' : 'html' ]( memory.preview );
  } else {
    $preview.addClass( 'placeholder' ).text( '0' );
  }

  for ( ; current < MAX_FONT_SIZE && display.scrollWidth <= $display.width(); current += step ) {
    display.style.fontSize = current + 'px';
  }

  for ( ; current > MIN_FONT_SIZE && display.scrollWidth > $display.width(); current -= step ) {
    display.style.fontSize = current + 'px';
  }

  if ( ( current = display.scrollWidth ) > $display.width() ) {
    display_wrapper.scrollLeft = current;
  }
};

var toStyle = function ( string ) {
  $.forInRight( table, function ( data ) {
    string = string.replace( data.rvalue, data.notation );
  } );

  return string;
};

var error = function () {
  if ( !$( 'body' ).hasClass( 'error' ) ) {
    window.navigator.vibrate( 25 );
    $( 'body' ).addClass( 'error' );

    window.setTimeout( function () {
      $( 'body' ).removeClass( 'error' );
    }, 25 );
  }
};

var listener = function () {
  var value = this.value,
      data = table[ value === 'brackets' ? '(' : value ],
      activity = data ? data.activity : $( this ).attr( 'activity' ),
      type = data ? data.type : $( this ).attr( 'type' ),
      values = memory.values,
      display = memory.display,
      current = memory.current,
      last = memory.last,
      lastSymbol = util.last( current ),
      add = activity !== 'function' && ( last !== 'none' || type !== 'constant' ),
      id = this.id;

  if ( lastSymbol === '+' && activity !== 'operation' && type !== 'number' && activity !== 'exp' || lastSymbol === '-' && ( id === 'root' || activity === 'factorial' || ( current !== lastSymbol ? activity !== 'operation' && type !== 'number' && activity !== 'exp' : activity === 'operation' ) ) || lastSymbol === '.' && type !== 'number' ) {
    return error();
  }

  switch ( activity ) {
    case 'exp':
      if ( last === 'number' ? current !== '-' : last !== 'operation' && last !== 'none' ) {
        memory.push( '*' );
      }

      memory.push.apply( memory, value.split( '' ) );
      memory.current = '';
      memory.last = 'operation';

      break;

    case 'factorial':
      if ( last !== 'none' && last !== 'operation' ) {
        memory.push( value );
        memory.current = '';
        memory.last = type;
      } else {
        error();
      }

      break;

    case 'operation':
      if ( last === 'none' ) {
        if ( value === '-' ) {
          memory.push( memory.current = value );
          memory.last = 'number';
        } else {
          error();
        }

        break;
      }

      if ( last === 'operation' ) {
        if ( value === '-' && !current ) {
          memory.push( '(', memory.current = value );
          memory.last = 'number';
        } else {
          util.last( values, value );
          util.last( display, data.notation );
          memory.update();
        }

        break;
      }

    case 'function':
      if ( id === 'root' ) {
        var i, j, notation, count, none, power, factorial;

        if ( util.last( values ) === '!' ) {
          for ( j = values.length - 1; j > 0 && values[ j - 1 ] === '!'; --j ) {}

          factorial = {
            values: values.splice( j ),
            display: display.splice( j )
          };

          memory.update();
          last = memory.last;
          current = memory.current;
          lastSymbol = util.last( current );
        }

        if ( last === 'bracket' ) {
          for ( count = 1, i = values.length - 2; i >= 0; --i ) {
            if ( ( power = values[ i ] ) === ')' ) {
              ++count;
            } else if ( ( util.last( power ) === '(' || !power.indexOf( 'root(' ) ) && !--count ) {
              if ( values[ i - 1 ] === '-' && ( !( none = values[ i - 2 ] ) || none === '(' ) ) {
                --i;
              }

              break;
            }
          }

          if ( i < 0 ) {
            break;
          }
        } else if ( last === 'number' || lastSymbol === 'e' ) {
          i = -current.length;

          if ( current.charAt( 0 ) === '-' && util.nth( values, i - 1 ) === '(' ) {
            --i;
          }
        } else if ( last === 'constant' ) {
          i = util.nth( values, -2 ) === '-' && ( !( none = util.nth( values, -3 ) ) || none === '(' ) ? none ? -3 : -2 : -1;
        } else {
          error();
          break;
        }

        power = values.splice( i );
        notation = display.splice( i );

        if ( factorial ) {
          power = power.concat( factorial.values );
          notation = notation.concat( factorial.display );
        }

        memory.roots.values.push( power );
        memory.roots.display.push( notation );

        if ( last !== 'bracket' && power[ 0 ] === '(' ) {
          power = power.slice( 1 );
          notation = notation.slice( 1 );
        }

        values.push( 'root(' + power.join( '' ) + ',' );
        display.push( '<sup>' + notation.join( '' ) + '</sup>' + data.notation + table[ '(' ].notation );
        memory.last = type;
        memory.current = '';

        break;
      }

    case 'number':
      if ( type === 'number' && ( current === '0' || current === '-0' || /e[+-]?0/.test( current ) ) ) {
        if ( value !== '0' ) {
          util.last( values, value );
          util.last( display, data.notation );
          memory.current = current.slice( 0, -1 ) + value;
        } else {
          error();
        }

        break;
      }

      if ( last !== 'none' ) {
        if ( last === 'constant' && type === 'number' && !current ) {
          memory.push( '*' );
        } else if ( type === 'operation' ) {
          add = lastSymbol === 'e' && ( value === '-' || value === '+' );
        } else if ( last === 'bracket' || type === 'constant' && ( last === 'number' && lastSymbol !== '-' ? value !== 'e' || current.indexOf( value ) > 0 : true || last !== 'operation' ) || last === 'number' && activity === 'function' || last === 'constant' && ( type === 'constant' || activity === 'function' ) ) {
          add = false;

          if ( last !== 'operation' && current !== '-' ) {
            memory.push( '*' );
          }
        }
      }

      memory.current = add ? current + value : '';
      memory.last = type;
      values.push( value );

      display.push( activity === 'function' ?
        data.notation + table[ '(' ].notation :
        data.notation );

      break;

    case 'bracket':
      if ( last === 'bracket' || last === 'number' && current !== '-' || last === 'constant' ) {
        value = values.join( '' );

        if ( util.count( value, ')' ) < util.count( value, '(' ) ) {
          memory.push( ')' );
          memory.last = 'bracket';
        } else {
          memory.push( '*', '(' );
          memory.last = 'none';
        }
      } else {
        memory.push( '(' );
        memory.last = 'none';
      }

      memory.current = '';

      break;

    case 'comma':
      if ( !current || current === '-' || lastSymbol === 'e' ) {
        if ( last === 'bracket' || last === 'constant' ) {
          memory.push( '*' );
        }

        memory.push( '0', value );
        memory.last = 'number';
        memory.current = current === '-' ? '-0.' : '0.';
      } else if ( /^-?\d+$/.test( current ) ) {
        memory.push( value );
        memory.current += value;
      } else {
        error();
      }
  }

  update();
  render();
};

var clear = function () {
  var value = util.last( memory.values ),
      root = value && !value.indexOf( 'root(' );

  if ( memory.values.length < 2 && !root ) {
    return clearAll();
  }

  memory.values.pop();
  memory.display.pop();

  if ( root ) {
    memory.values = memory.values.concat( memory.roots.values.pop() );
    memory.display = memory.display.concat( memory.roots.display.pop() );
  }

  memory.update();
  update();
  render();
};

var clearAll = function () {
  memory.last = 'none';
  memory.values.length = memory.display.length = memory.roots.values.length = memory.roots.display.length = 0;
  memory.calculated = memory.current = memory.preview = '';
  memory.valid = false;
  render();
};

$( '.controls button' )
  .touchstart( function ( event ) {
    this.className += ' active';
    this.touchend = false;

    this.lastTouch = {
      x: event.targetTouches[ 0 ].clientX,
      y: event.targetTouches[ 0 ].clientY
    };
  } )
  .touchmove( function ( event ) {
    // In FF 'touchmove' event gets
    // triggered on long press
    if ( this.lastTouch.x !== event.targetTouches[ 0 ].clientX || this.lastTouch.y !== event.targetTouches[ 0 ].clientY ) {
      this.touchend = true;
      $( this ).trigger( 'touchend' );
    }
  } )
  .touchend( function ( event ) {
    $( this ).removeClass( 'active' );
  } );

var $display = $( '#display' ),
    $preview = $( '#preview' ),
    $buttons = $( '.number, .operation, .function, .brackets, .comma' ),
    display_wrapper = $( '.display-wrapper' )[ 0 ],
    MIN_FONT_SIZE = 27,
    MAX_FONT_SIZE = window.parseInt( $.style( $display[ 0 ], 'font-size' ), 10 );

$buttons.touchend( function ( event ) {
  if ( !this.touchend ) {
    listener.call( this );
  }
} );

$( '.clear' ).longtouch( clearAll, function () {
  this.touchend || clear();
} );

var map = function ( value ) {
  return this[ value ].notation;
};

$( '.equals' ).touchend( function () {
  if ( this.touchend ) {
    return;
  }

  if ( !memory.valid || memory.calculated === 'NaN' ) {
    return error();
  }

  if ( memory.calculated === 'Infinity' || memory.calculated === '-Infinity' ) {
    memory.current = '';
    memory.last = 'constant';
    memory.values = memory.calculated.split( /\b/ );
    memory.display = $.map( memory.values, map, table );
  } else {
    memory.values = memory.calculated.split( '' );
    memory.display = $.map( memory.values, map, table );

    if ( /^-?\d+(?:\.\d+)?$/.test( memory.calculated ) ) {
      memory.current = memory.calculated;
      memory.last = 'number';
    } else {
      memory.update();
    }
  }

  render();
} );

( function () {
  var angles = [ 'deg', 'rad' ],
      index = 0,

  $toggle = $( '#angles' ).touchend( function () {
    if ( !this.touchend ) {
      $toggle.text( memory.angles = angles[ ++index % angles.length ] );
      update();
      render();
    }
  } );
} )();

$( '.memory' ).touchend( function () {
  if ( !this.touchend ) {
    if ( memory.valid && memory.calculated !== '0' && memory.calculated !== '-0' && memory.memory !== 'Infinity' && memory.memory !== '-Infinity' && memory.calculated.indexOf( 'i' ) < 0 ) {
      memory.memory = '' + ( math[ this.value ]( memory.memory, math[ 'eval' ]( memory.calculated ) ) || 0 );
      $mrc.toggleClass( 'enabled', memory.memory !== '0' );
    } else {
      error();
    }
  }
} );

var $mrc = $( '#mrc' ).longtouch( function () {
  memory.memory = '0';
  $mrc.removeClass( 'enabled' );
}, function () {
  if ( this.touchend || memory.memory === '0' ) {
    return;
  }

  if ( /[.\-+]$/.test( memory.current ) ) {
    return error();
  }

  var save = memory.memory,
      last = memory.last,
      values = memory.values,
      display = memory.display;

  if ( last === 'bracket' || last === 'constant' || last === 'number' && memory.current !== '-' ) {
    memory.push( '*' );
  }

  if ( save.charAt( 0 ) === '-' && last !== 'none' ) {
    memory.push( '(' );
  }

  if ( save === 'Infinity' || save === '-Infinity' ) {
    memory.current = '';
    memory.last = 'constant';
    save = save.split( /\b/ );
  } else {
    memory.current = save;
    memory.last = 'number';
    save = save.split( '' );
  }

  memory.values = values.concat( save );
  memory.display = display.concat( $.map( save, map, table ) );
  update();
  render();
} );

$( '#inverse' ).touchend( function () {
  if ( !this.touchend ) {
    $( this ).toggleClass( 'enabled' );
    $( '.inverse button' ).toggle();
  }
} );

$( '#extend' ).touchend( function () {
  if ( !this.touchend ) {
    $( this ).toggleClass( 'enabled' );
    $( '.extend' ).toggleClass( 'disabled' );
  }
} );

var table = function ( $ ) {
  var Data = function ( notation, activity, type, hooks ) {
    this.notation = notation;
    this.activity = activity;
    this.type = type;
  };

  var table = $.fromPairs( $.map( $buttons, function ( button ) {
    return [ button.value, new Data( ( button = this( button ) ).attr( 'notation' ) || button.html(), button.attr( 'activity' ), button.attr( 'type' ) ) ];
  }, $ ) );

  table.Infinity = new Data( '\u221e', 'number', 'constant' );
  table.NaN = new Data( 'Не число', 'number', 'constant' );
  table[ '(' ] = new Data( '(', 'bracket', 'none' );
  table[ ')' ] = new Data( ')', 'bracket', 'bracket' );
  table.i = new Data( 'i', 'number', 'constant' );
  delete table.brackets;

  return $.forInRight( table, function ( data, value ) {
    data.rvalue = this( value.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1' ), 'g' );
  }, window.RegExp );
}( $ );

( function ( math, memory ) {
  var root = math.nthRoot,
      pi = math.pi;

  var imports = {
    root: function ( power, value ) {
      return value.isPositive() || value.isZero() || power.isNegative() && !power.isZero() || power.abs().mod( 2 ).equals( 1 ) ?
        root( value, power ) : math.complex( 0, root( value.abs(), power ) );
    }
  };

  $.forEachRight( [ 'sin', 'cos', 'tan', 'cot' ], function ( name ) {
    var get = math[ name ],
        config = this;

    imports[ name ] = function ( value ) {
      switch ( config.angles ) {
        case 'deg': return get( value.div( 180 ).times( pi ) );
        case 'rad': return get( value );
      }

      return 0;
    };
  }, memory );

  $.forEachRight( [ 'asin', 'acos', 'atan', 'acot' ], function ( name ) {
    var get = math[ name ],
        config = this;

    imports[ name ] = function ( value ) {
      switch ( config.angles ) {
        case 'deg': return get( value ).div( pi ).times( 180 );
        case 'rad': return get( value );
      }

      return 0;
    };
  }, memory );

  math.import( imports, { override: true } );
} )( math, memory );

// math.js has "lazy functions", remove freezes
math[ 'eval' ]( 'root(5, sin(32))' );

} )( this.peako, this );
