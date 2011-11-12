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
  {
  }, function(module, exports, DEFS, require) {

var util = require('util');

module.exports = { 'encode'  : encode
                 , 'decode'  : decode
                 , 'typeOf'  : typeOf
                 , 'is_equal': is_equal

                 , 'I' : inspect
                 , 'JS': JSON.stringify
                 };

//
// Aliases for rules
//

module.exports.GONE = ['gone'];
module.exports.ANY  = ['any'];
module.exports.TRUTHY = ['truthy'];
module.exports.FALSY  = ['falsy'];
module.exports.TIMESTAMP = ['timestamp'];

//
// Utilities
//

function inspect(obj) {
  return util.inspect(obj, false, 5);
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

  throw new Error('Unknown type "' + type + '": ' + obj);
}

function decode(obj) {
  console.error('decode: ' + inspect(obj));
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