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


module.exports = { 'encode'  : encode
                 , 'typeOf'  : typeOf
                 , 'is_equal': is_equal

                 , 'JS': JSON.stringify
                 };

//
// Aliases for rules
//

module.exports.GONE = ['gone'];
module.exports.ANY  = ['any'];

//
// Utilities
//

function encode(obj) {
  var type = typeOf(obj);
  var result, a;
  var literals = {'string':1, 'null':1, 'number':1, 'boolean':1};

  if(type === 'undefined')
    return ['undefined'];

  else if(type in literals)
    return obj;

  else if(type === 'array') {
    result = [];
    for(a = 0; a < obj.length; a++)
      result[a] = encode(obj[a]);
    return result;
  }

  else if(type === 'object') {
    result = {};
    for (a in obj)
      if(obj.hasOwnProperty(a))
        result[a] = encode(obj[a]);
    return result;
  }

  throw new Error('Unknown type: ' + type);
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
