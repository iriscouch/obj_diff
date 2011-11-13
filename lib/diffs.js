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
  { "couchdb": false
  }, function(module, exports, DEFS, require) {

var lib = require('../lib')
  , assert = require('assert')
  , rules = require('./rules')
  ;

module.exports = { 'Diff'    : Diff
                 , 'obj_diff': obj_diff
                 };


function obj_diff(from, to, result, prefix, is_array) {
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
      change_key = is_array ? (prefix + '[' + key + ']') : (prefix + '.' + key);

    console.dir({toprop:to.hasOwnProperty(key), fromprop:from.hasOwnProperty(key)});
    if(!to.hasOwnProperty(key))
      result[change_key] = {'from':from_val, 'to':lib.GONE};

    else if(!from.hasOwnProperty(key))
      result[change_key] = {'from':lib.GONE, 'to':to_val};

    else if(lib.typeOf(from_val) == 'object' && lib.typeOf(to_val) == 'object')
      obj_diff(from_val, to_val, result, change_key);

    else if(lib.typeOf(from_val) == 'array' && lib.typeOf(to_val) == 'array')
      obj_diff(from_val, to_val, result, change_key, true)

    else if(!lib.is_equal(from_val, to_val))
      result[change_key] = {'from':from_val, 'to':to_val};

  })

  return lib.encode(result);
}


function Diff (from, to) {
  var self = this;
  var args = Array.prototype.slice.apply(arguments);
  var diff;

  if(!to && lib.typeOf(from) === 'object') // diff data given directly
    diff = from;
  else if(args.length === 2)
    diff = obj_diff(args[0], args[1]);
  else
    throw new Error('Unknown arguments: ' + JSON.stringify(args));

  Object.keys(diff).forEach(function(key) {
    self[key] = diff[key];
  })

  console.error('Diff: ' + lib.I(self));
}


// Return true for no change
Diff.prototype.nochange = function() {
  var self = this;

  return self.atmost();
}

// Return whether all changes match the rules.
Diff.prototype.atmost = function() {
  var self = this;

  var all_rules = rules.make.apply(null, arguments);

  if(DEFS.couchdb) {
    all_rules.push( new rules.Rule('_id'             , lib.GONE, String)
                  , new rules.Rule('_rev'            , lib.GONE, String)
                  , new rules.Rule('_rev'            , String  , String)
                  , new rules.Rule('_revisions.start', lib.GONE, Number)
                  , new rules.Rule('_revisions.ids'  , lib.GONE, Array)
                  )
  }

  console.error('atmost:\n' + lib.I({diff:self, rules:all_rules}));

  var key, a, is_match;
  for (key in self) {
    if(!self.hasOwnProperty(key))
      continue;

    is_match = false;
    for(a = 0; a < all_rules.length; a++)
      if(all_rules[a].match(key, self[key].from, self[key].to)) {
        is_match = true;
        break;
      }


    if(!is_match)
      return false;
  }

  return true;
}

// Return whether the all rules match the changes.
Diff.prototype.atleast = function() {
  var self = this;

  var all_rules = rules.make.apply(null, arguments);
  console.error('atleast:\n' + lib.I({diff:self, rules:all_rules}));

  var key, a, is_match;
  for(a = 0; a < all_rules.length; a++) {
    is_match = false;

    for (key in self)
      if(self.hasOwnProperty(key)) {
        if(all_rules[a].match(key, self[key].from, self[key].to)) {
          is_match = true;
          break;
        }
      }

    if(!is_match)
      return false;
  }

  return true;
}

Diff.prototype.assert = {};

Diff.prototype.assert.atmost = function() {
  var self = this;

  var result = self.atmost.apply(self, arguments);
  assert.equal(is_match, true, 'Change must match: ' + lib.JS(key)
                               + ' -> ' + lib.JS({'from':self.changes[key].from, 'to':self.changes[key].to}));
}

Diff.prototype.assert.atleast = function() {
  throw new Error('Not implemented');
}

}) // defaultable
