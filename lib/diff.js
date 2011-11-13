// obj_diff
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

var defaultable = require('defaultable');

defaultable(module,
  {
  }, function(module, exports, DEFS, require) {

var lib = require('../lib')
  , rules = require('./rules')
  , diffs = require('./diffs')
  , assert = require('assert')
  ;

module.exports = { 'diff': diff
                 , 'GONE': lib.GONE
                 , 'ANY' : lib.ANY
                 , 'TRUTHY': lib.TRUTHY
                 , 'FALSY' : lib.FALSY
                 };

// Return an object representing fields that have changed from an old object to a new one.
// The returned object has keys such as "foo"  The values are an object of {from: Oldval, to: Newval}.
function diff(from, to, opts) {
  assert.equal(lib.typeOf(from), 'object', 'First argument is not an object');
  assert.equal(lib.typeOf(to)  , 'object', 'Second argument is not an object');

  return new diffs.Diff(from, to);
}


function change_matches(allowed_change, from_value, to_value) {
  if(lib.typeOf(allowed_change) != 'object')
    throw new Error("allowed_change must be an object");

  //var I = require('sys').inspect;
  //console.log('change_matches:\n%s', I({allowed_change:allowed_change, from_value:from_value, to_value:to_value}));
  //for (var a in allowed_change)
  //  console.log("  I see: " + a);

  if(allowed_change.hasOwnProperty('from') && allowed_change.hasOwnProperty('to') && lib.is_equal(allowed_change.from, allowed_change.to))
    throw new Error("This indicates no change at all: " + JSON.stringify(allowed_change));

  var checker_for = function(change_type) {
    if(!allowed_change.hasOwnProperty(change_type))
      return function(x) { return true; };

    // TODO: This code is unable to handle changes from a scalar into a deep object. For example,
    // {} vs. {"something": {"foo":"bar"}}
    // from_value: undefined
    // to_value: {"foo": "bar"}
    // It would be nice to say allowed_change = {to: {foo: {}}}. That would require calling doc_diff
    // again, and may warrant the full change to the flat namespace with dotted keys format.
    // {"something.foo": {"to":{}, exact:false}}
    var val = allowed_change[change_type];
    if(lib.typeOf(val) == 'undefined')
      return function(x) { return x === undefined; };
    if(lib.typeOf(val) == 'regexp')
      return function(x) { return lib.typeOf(x) == 'string' && val.test(x); };
    if(val === Array)
      return function(x) { return lib.typeOf(x) == 'array'; }
    if(lib.typeOf(val) == 'function')
      return val;
    return function(x) { return lib.is_equal(val, x); };
  }

  return checker_for('from')(from_value) && checker_for('to')(to_value);
}

function is_change_rule(rule) {
  if(lib.typeOf(rule) !== 'object')
    return false;

  var keys = Object.keys(rule);
  if(keys.length == 0)
    return true;
  if(keys.length == 1 && (rule.hasOwnProperty('from') || rule.hasOwnProperty('to')))
    return true;
  if(keys.length == 2 && rule.hasOwnProperty('from') && rule.hasOwnProperty('to'))
    return true;

  return false;
  //console.log('Rule "%s" is a rule? %s!', require('sys').inspect(rule), is_change_rule(rule));
}

// Return whether the differences between two documents contains a subset of those specified.
function doc_diff_atleast(from, to, required) {
  var diff = doc_diff(from, to);

  for (var key in required) {
    if(key !== 'nest' && !diff.hasOwnProperty(key))
      return false;

    var rule = required[key];
    if(is_change_rule(rule)) {
      // Normal change check.
      if(!change_matches(rule, diff[key].from, diff[key].to))
        return false;
    } else if(key !== 'nest') {
      // Nested comparison
      if(!doc_diff_atleast(from[key], to[key], rule))
        return false;
    }
  }
  return true;
}

}) // defaultable
