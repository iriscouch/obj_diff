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

var lib = require('../lib')
  ;


module.exports = { 'Rule': Rule
                 , 'make': make_rules
                 };

var TIMESTAMP_RE = /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.(\d\d\d)Z$/;

function Rule (key, from, to) {
  var self = this;
  var args = Array.prototype.slice.apply(arguments);
  var rule;

  if(args.length === 1 && lib.typeOf(key) === 'object') // rule data given directly
    rule = key;
  else if(args.length === 3)
    rule = lib.encode({'key':key, 'from':from, 'to':to});
  else
    throw new Error('Unknown arguments: ' + JSON.stringify(args));

  self.key = rule.key;
  self.from = rule.from;
  self.to = rule.to;

  console.error('Rule: ' + lib.I(self));
}

Rule.prototype.match = function(key, from, to) {
  var self = this;

  console.error('Match ' + lib.I([self.key, self.from, self.to]) + ' to ' + lib.I([key, from, to]));
  var result = (  self.key === key
               && element_match(self.from, from)
               && element_match(self.to, to)
               );

  console.error(' = = > ' + result);
  return result;
}


function element_match(guide, element) {
  var result = _element_match(guide, element);
  console.error('element match: ' + lib.I(guide) + ' to ' + lib.I(element));
  console.error(' => ' + result);
  return result;
}

function _element_match(guide, element) {
  element = lib.decode(element);
  element = {'type':lib.typeOf(element), 'val':element};
  guide   = {'type':lib.typeOf(guide)  , 'val':guide  };
  console.error(lib.I({el:element, gu:guide}));

  // Check for an escaped array.
  if(guide.type === 'array' && guide.val[0] === 'array')
    guide.val = guide.val[1];

  else if(guide.type === 'array') {
    // Evaluate special stuff.
    var special = guide.val[0];

    if(special === 'any'   ) return true;
    if(special === 'truthy') return !! element.val;
    if(special === 'falsy' ) return  ! element.val;
    if(special === 'gone'  ) return element.type === 'array' && element.val[0] === 'gone';

    if(special === 'Boolean'  ) return element.type === 'boolean';
    if(special === 'String'   ) return element.type === 'string';
    if(special === 'Object'   ) return element.type === 'object';
    if(special === 'Array'    ) return element.type === 'array';
    if(special === 'Number'   ) return element.type === 'number';
    if(special === 'undefined') return element.type === 'undefined';
    if(special === 'undefined') return element.type === 'undefined';

    if(special === 'timestamp')
      return !! element.val.match(TIMESTAMP_RE);

    if(special === 'regexp') {
      var regex = new RegExp(guide.val[1], guide.val[2]);
      return !! element.val.match(regex);
    }

    else
      throw new Error('Unknown guide: ' + lib.I(guide.val));
  }

  return lib.is_equal(guide.val, element.val);
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
