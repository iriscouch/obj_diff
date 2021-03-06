// Helper library
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

require('defaultable')(module,
  { "verbose": false
  }, function(module, exports, DEFS, require) {

var util = require('util')
  , assert = require('assert')
  ;

module.exports = { 'encode'  : encode
                 , 'decode'  : decode
                 , 'typeOf'  : typeOf
                 , 'args'    : arguments_array
                 , 'is_equal': is_equal
                 , 'log'     : log
                 , 'dir'     : dir

                 , 'I' : inspect
                 , 'JS': JSON.stringify
                 , 'JDUP': JDUP
                 };

//
// Aliases for rules
//

module.exports.GONE = ['gone'];
module.exports.ANY  = ['any'];
module.exports.TRUTHY = ['truthy'];
module.exports.FALSY  = ['falsy'];
module.exports.TIMESTAMP = ['timestamp'];
module.exports.LESSER = ['lesser'];
module.exports.GREATER = ['greater'];

//
// Utilities
//

function noop() {}

function arguments_array(args) {
  return Array.prototype.slice.apply(args);
}

function JDUP(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function inspect(obj) {
  return util.inspect(obj, false, 5);
}

function dir(obj) {
  return log(obj);
}

function log(fmt) {
  if(!DEFS.verbose)
    return;

  if(typeof console === 'object' && typeof console.error === 'function')
    return console.error.apply(console, arguments);

  if(typeof log !== 'function')
    throw new Error('Cannot log: no console.error() or log()');

  var args = Array.prototype.slice.apply(arguments, [1]);
  fmt = fmt.replace(/%j/g, function(code, pos, str) {
    return JSON.stringify(args.shift());
  })

  return log(fmt);
}

function encode(obj) {
  var type = typeOf(obj);
  var result, a;
  var literals = {'string':1, 'null':1, 'number':1, 'boolean':1};
  var types = [String, Number, Boolean, Object, Array];

  if(type in literals)
    return obj;

  else if(type === 'undefined')
    return ['undefined'];

  else if(~ types.indexOf(obj))
    return [obj.name];

  else if(type === 'regexp')
    return [ 'regexp'
           , obj.source
           , [ obj.global     ? 'g' : ''
             , obj.ignoreCase ? 'i' : ''
             , obj.multiline  ? 'm' : ''
             ].join('')
           ];

  else if(type === 'array') {
    if(obj.length === 1) {
      if(obj[0] === 'gone'  ) return ['gone'];
      if(obj[0] === 'any'   ) return ['any'];
      if(obj[0] === 'truthy') return ['truthy'];
      if(obj[0] === 'falsy' ) return ['falsy'];
      if(obj[0] === 'timestamp') return ['timestamp'];
      if(obj[0] === 'lesser') return ['lesser'];
      if(obj[0] === 'greater') return ['greater'];
    }

    return ['array', obj.map(encode)];
  }

  else if(type === 'object') {
    result = {};
    for (a in obj)
      if(obj.hasOwnProperty(a))
        result[a] = encode(obj[a]);
    return result;
  }

  else if(type === 'function') {
    var match, lines;
    var def_re = /^function\s+(.*?)\((.*?)\) \{(.*)$/;

    var def = obj.toString();
    assert.equal(typeof def, 'string', 'Source code string of callback function');

    def = def.split(/\r?\n/);
    match = def[0].match(def_re);
    assert.ok(match, 'Function definition: ' + def[0]);

    var func_name = match[1];
    var func_args = match[2];

    var func_body = [ match[3] ].concat(def.slice(1)); // First line plus all the rest.

    match = func_body[func_body.length - 1].match(/^(.*)\}$/);
    assert.ok(match, 'End of function body: ' + func_body[func_body.length - 1]);
    func_body[func_body.length - 1] = match[1];

    result = ['function', func_name, func_args, func_body.join('\n')];
    log('Function: ' + inspect(result))
    return result;
  }

  throw new Error('Unknown type "' + type + '": ' + obj);
}

function decode(obj) {
  log('decode: ' + inspect(obj));
  var type = typeOf(obj);
  var k, result;

  if(type === 'object') {
    result = {};
    for (k in obj)
      if(obj.hasOwnProperty(k))
        result[k] = decode(obj[k]);
    return result;
  }

  if(type !== 'array')
    return obj;

  var type = obj[0];
  obj      = obj[1];


  if(type === 'array')
    return obj;

  else if(type === 'undefined')
    return undefined;

  else if(type === 'gone')
    return ['gone'];
  else if(type === 'any')
    return ['any'];
  else if(type === 'timestamp')
    return ['timestamp'];
  else if(type === 'lesser')
    return ['lesser'];
  else if(type === 'greater')
    return ['greater'];

  else if(type === 'String')
    return String;
  else if(type === 'Number')
    return Number;
  else if(type === 'Boolean')
    return Boolean;
  else if(type === 'Object')
    return Object;
  else if(type === 'Array')
    return Array;

  throw new Error('Unknown object to decode: ' + inspect(obj));
  throw new Error('Unknown object to decode: ' + JSON.stringify(obj));
}


function typeOf(value) {
  var s = typeof value;
  var as_str;

  if (s === 'object') {
    if(!value)
      return 'null';

    as_str = Object.prototype.toString.apply(value);

    if(value instanceof RegExp || as_str === '[object RegExp]')
      return 'regexp'; // NodeJS 0.5

    if(value instanceof Array || as_str === '[object Array]')
      return 'array';
  }

  else if(s === 'function' && value instanceof RegExp)
    return 'regexp'; // NodeJS 0.4

  return s;
}


// Equality that works for objects.
function is_equal(a, b) {
  var a_type = typeOf(a)
    , b_type = typeOf(b)
    , i
    ;

  if(a_type !== b_type)
    return false;

  else if(a_type === 'array') {
    if(a.length !== b.length)
      return false;

    for(i = 0; i < a.length; i++)
      if(!is_equal(a[i], b[i]))
        return false;

    return true;
  }

  else if(a_type == 'object') {
    if(Object.keys(a).length !== Object.keys(b).length)
      return false;

    for(i in a)
      if(!is_equal(a[i], b[i]))
        return false;

    return true;
  }

  else
    return a === b;
}

}) // defaultable
