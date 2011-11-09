// rules
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

var lib = require('./lib')
  ;


module.exports = { 'Rule': Rule
                 , 'make': make_rules
                 };


function Rule (key, from, to) {
  var self = this;

  if(arguments.length != 3)
    throw new Error('Invalid rules parameters: ' + JSON.stringify([key, from, to]));

  self.key  = key;
  self.from = lib.decode(from);
  self.to   = lib.decode(to);
}


Rule.prototype.match = function(key, from, to) {
  var self = this;

  console.error('Match ' + require('util').inspect({rule:[self.key, self.from, self.to], change:[key, from, to]}, false, 5));
  return self.key === key && element_match(self.from, from) && element_match(self.to, to);
}


function element_match(guide, element) {
  element = lib.decode(element);

  console.error('element match: ' + require('util').inspect({guide:guide, element:element}, false, 5))
  var type = lib.typeOf(element);

  if(guide === Boolean && type === 'boolean' ||
     guide === String && type === 'string'   ||
     guide === Object && type === 'object'   ||
     guide === Array && type === 'array'     ||
     guide === Number && type === 'number')
    return true;

  else if(lib.typeOf(guide) === 'array') {
    guide = guide[0];

    if(guide === 'any')
      return true;

    else if(guide === 'gone' && lib.typeOf(element) === 'array' && element[0] === 'gone')
      return true;
  }

  return lib.is_equal(guide, element);
}


function make_rules() {
  var args = Array.prototype.slice.apply(arguments);

  //console.error('make_rules: args=' + JSON.stringify(args))

  var rules = [];

  while(args.length > 0)
    rules.push(make_rule());
  return rules;

  function make_rule() {
    var first = args.shift();
    if(first instanceof Rule)
      return first;

    else if(lib.typeOf(first) == 'object' && first.constructor.name == 'Rule')
      return first;

    var key  = first;
    var from = args.shift();
    var to   = args.shift();

    return new Rule(key, from, to);
  }
}

}) // defaultable
