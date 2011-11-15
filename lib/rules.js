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
  , assert = require('assert')
  ;


module.exports = { 'Rule': Rule
                 , 'make': make_rules
                 , 'is_rule': is_rule
                 };

var TIMESTAMP_RE = /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.(\d\d\d)Z$/;

function Rule (key, reason, from, to) {
  var self = this;
  var args = lib.args(arguments);
  var rule;

  if(args.length === 1 && lib.typeOf(key) === 'object') // rule data given directly
    rule = key;
  else if(args.length === 4)
    rule = lib.encode({'key':key, 'from':from, 'to':to, 'reason':reason});
  else
    throw new Error('Unknown arguments: ' + JSON.stringify(args));

  self.reason = rule.reason;
  self.key = rule.key;
  self.from = rule.from;
  self.to = rule.to;

  console.error('Rule: ' + lib.I(self));
}


Rule.prototype.match = function(key, from, to) {
  var self = this;

  console.error('Match ' + lib.I([self.key, self.from, self.to]) + ' to ' + lib.I([key, from, to]));
  var result = (  self.key === key
               && element_match(self.from, from, to)
               && element_match(self.to, to, from)
               );

  console.error(' = = > ' + result);
  return result;
}


function element_match(guide, element, other) {
  var result = _element_match(guide, element, other);
  console.error('element match: ' + lib.I(guide) + ' to ' + lib.I([element, other]));
  console.error(' => ' + result);
  return result;
}

function _element_match(guide, element, other) {
  element = lib.decode(element);
  other   = lib.decode(other);
  guide   = {'type':lib.typeOf(guide)  , 'val':guide  };
  element = {'type':lib.typeOf(element), 'val':element};
  other   = {'type':lib.typeOf(other)  , 'val':other  };

  console.error(lib.I({el:element, gu:guide, ot:other}));

  // Check for an escaped array.
  if(guide.type === 'array' && guide.val[0] === 'array')
    guide.val = guide.val[1];

  else if(guide.type === 'array') {
    // Evaluate special stuff.
    var special = guide.val[0];
    var el_gone = function() { return element.type === 'array' && element.val[0] === 'gone' };

    if(special === 'any'   ) return true;
    if(special === 'gone'  ) return  el_gone();
    if(special === 'truthy') return !el_gone()  && !! element.val;
    if(special === 'falsy' ) return  el_gone()  ||  ! element.val;

    if(special === 'Boolean'  ) return element.type === 'boolean';
    if(special === 'String'   ) return element.type === 'string';
    if(special === 'Object'   ) return element.type === 'object';
    if(special === 'Array'    ) return element.type === 'array';
    if(special === 'Number'   ) return element.type === 'number';
    if(special === 'undefined') return element.type === 'undefined';
    if(special === 'undefined') return element.type === 'undefined';

    if(special === 'timestamp')
      return !! element.val.match(TIMESTAMP_RE);

    if(special === 'lesser')
      return (element.type === other.type) && (element.val < other.val);
    if(special === 'greater')
      return (element.type === other.type) && (element.val > other.val);

    if(special === 'regexp') {
      var regex = new RegExp(guide.val[1], guide.val[2]);
      return !! element.val.match(regex);
    }

    if(special === 'function') {
      var func_name = guide.val[1]
        , func_args = guide.val[2]
        , func_body = guide.val[3]
        ;

      var predicate = Function(func_args, func_body);
      return !! predicate(element.val, other.val);

      [ 'function',
        'is_even',
        'val, other',
        '\n    return (\n    val % 2) == 0;\n  '
      ]
    }

    else
      throw new Error('Unknown guide: ' + lib.I(guide.val));
  }

  return lib.is_equal(guide.val, element.val);
}


function make_rules(with_reason, args) {
  var args = lib.args(args);
  console.error('make_rules ('+with_reason+'): args=' + JSON.stringify(args))

  var rules = [];
  while(args.length > 0)
    rules.push(make_rule());
  return rules;

  function make_rule() {
    if(is_rule(args[0]))
      return args.shift();

    var err_msg = with_reason
                    ? 'Must provide key, reason, old_val, new_val arguments'
                    : 'Must provide key, old_val, new_val arguments';

    assert.ok(args.length >= 3, err_msg);
    assert.ok(!with_reason || args.length >= 4, err_msg); // Require the extra reason parameter.

    var key    = args.shift()
      , reason = with_reason ? args.shift() : null
      , from   = args.shift()
      , to     = args.shift()

    assert.equal(is_rule(reason), false, err_msg);
    assert.equal(is_rule(from)  , false, err_msg);
    assert.equal(is_rule(to)    , false, err_msg);

    return new Rule(key, reason, from, to);
  }
}


function is_rule(obj) {
  return (obj instanceof Rule) || (lib.typeOf(obj) == 'object' && obj.constructor.name == 'Rule');
}

}) // defaultable
