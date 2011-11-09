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
  { "revisions": true
  , "assert"   : false
  }, function(module, exports, DEFS, require) {

var lib = require('./lib')
  , rules = require('./rules')
  , assert = require('assert')
  ;

module.exports = { 'diff': diff
                 , 'GONE': lib.GONE
                 , 'ANY' : lib.ANY
                 };

// Return an object representing fields that have changed from an old object to a new one.
// The returned object has keys such as "foo"  The values are an object of {from: Oldval, to: Newval}.
function diff(from, to, opts) {
  assert.equal(lib.typeOf(from), 'object', 'First argument is not an object');
  assert.equal(lib.typeOf(to)  , 'object', 'Second argument is not an object');

  var result = new Diff(opts);
  result.changes = obj_diff(from, to);

  return result;
}

function obj_diff(from, to, result, prefix) {
  var all_keys = {};
  Object.keys(from).forEach(function(key) { all_keys[key] = 1 });
  Object.keys(to)  .forEach(function(key) { all_keys[key] = 1 });
  all_keys = Object.keys(all_keys);

  console.log('doc_diff: from=%j to=%j', from, to);
  result = result || {};

  all_keys.forEach(function(key) {
    var from_val = from[key];
    var to_val   = to[key];

    var change_key = key;
    if(prefix)
      change_key = prefix + '.' + key;

    console.dir({toprop:to.hasOwnProperty(key), fromprop:from.hasOwnProperty(key)});
    if(!to.hasOwnProperty(key))
      result[change_key] = {'from':from_val, 'to':lib.GONE};

    else if(!from.hasOwnProperty(key))
      result[change_key] = {'from':lib.GONE, 'to':to_val};

    else if(lib.typeOf(from_val) == 'object' && lib.typeOf(to_val) == 'object') {
      obj_diff(from_val, to_val, result, change_key);
      //if(!lib.is_equal(obj_diff, {}))
      //  diff.changes[key] = obj_diff;
    }

    else if(!lib.is_equal(from_val, to_val))
      result[change_key] = {'from':from_val, 'to':to_val};

  })

  console.error('Diff: ' + require('util').inspect(result));
  return result;
}

function Diff (opts) {
  var self = this;

  self.changes = null;

  opts = defaultable.merge(opts || {}, DEFS);
  self.is_asserting = !! opts.assert;
}

Diff.prototype.toJSON = function(key) {
  return lib.encode(this);
}


Diff.prototype.GONE = lib.GONE;
Diff.prototype.ANY  = lib.ANY;


// Return whether the differences between two documents contains a subset of those specified.
Diff.prototype.atmost = function() {
  var self = this;

  var all_rules = rules.make.apply(null, arguments);

  if(DEFS.revisions) {
    // Allow CouchDB changes to ._revisions.
    all_rules.push(new rules.Rule('_revisions.ids'
                                 , Array
                                 , function(X) { return lib.typeOf(X) === 'array' && X.length > 0 }));

  //console.error('atmost\n%s', require('util').inspect({diff:self, rules:all_rules}));

  var key, a, is_match;
  for (key in self.changes) {
    if(!self.changes.hasOwnProperty(key))
      continue;

    is_match = false;
    for(a = 0; a < all_rules.length; a++)
      if(all_rules[a].match(key, self.changes[key].from, self.changes[key].to)) {
        is_match = true;
        break;
      }


    if(self.is_asserting)
      assert.equal(is_match, true, 'Change must match: ' + lib.JS(key)
                                   + ' -> ' + lib.JS({'from':self.changes[key].from, 'to':self.changes[key].to}));
    else if(!is_match)
      return false; // Change matched no rules.
  }

  return true;
}

function xdoc_diff_atmost(from, to, allowed, strict) {
  var diff = doc_diff(from, to);
  //console.log('diff = ' + require('sys').inspect(diff));

  if(!strict && !allowed.hasOwnProperty('_revisions'))

  for (var key in diff) {
    if(key != 'nest' && !allowed.hasOwnProperty(key))
      return false; // This change was not specified at all.

    var rule = allowed[key];
    if(is_change_rule(rule)) {
      // Normal comparison check.
      if(!change_matches(rule, diff[key].from, diff[key].to))
        return false; // This change was specified but it did not match the approved type of change.
    } else {
      // Nested comparison.
      if(!doc_diff_atmost(from[key], to[key], rule))
        return false;
    }
  }
  return true;
}

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
