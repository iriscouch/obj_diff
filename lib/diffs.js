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


module.exports = { 'diff': make_diff
                 , 'Diff': Diff
                 };


// Return an object representing fields that have changed from an old object to a new one.
// The returned object has keys such as "foo"  The values are an object of {from: Oldval, to: Newval}.
function make_diff(from, to) {
  if(DEFS.couchdb) {
    from = from || {}; // Document creation sets from to `null`
    if(to && to._revisions) {
      // Make a copy and mutate to force some couchdb-safe matches.
      from = lib.JDUP(from);
      from._revisions = {};
    }
  }

  if(0 && DEFS.couchdb) {
    // Make a copy and mutate to force some couchdb-safe matches.
    from = lib.JDUP(from || {});
    from._revisions = {};
  }

  //console.error('make_diff: ' + lib.I({from:from, to:to}))
  assert.equal(lib.typeOf(from), 'object', 'First argument is not an object');
  assert.equal(lib.typeOf(to)  , 'object', 'Second argument is not an object');

  return new Diff(from, to);
}


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

Diff.prototype.bad_changes = bad_changes;
Diff.prototype.bad_rules   = bad_rules;

Diff.prototype.assert_nochange = assert_nochange;
Diff.prototype.assert_atleast  = assert_atleast;
Diff.prototype.assert_atmost   = assert_atmost;

Diff.prototype.nochange = nochange;
Diff.prototype.atleast  = atleast;
Diff.prototype.atmost   = atmost;


// Return true for no change
function nochange() {
  var self = this;
  return self.atmost();
}

// Return whether the all rules match the changes.
function atleast() {
  var self = this
    , all_rules = rules.make(false, arguments)

  return self.bad_rules(all_rules).length === 0;
}

// Return whether all changes match a rule.
function atmost() {
  var self = this
    , all_rules = rules.make(false, arguments)

  return self.bad_changes(all_rules).length === 0;
}


// Throw an exception if there are any changes at all.
function assert_nochange() {
  var self = this;

  var bad_changes = self.bad_changes([]);
  var first = bad_changes[0];

  if(first) {
    var msg = 'No changes allowed: "' + first.key + '" may not change: ' + lib.I(first.from) + ' -> ' + lib.I(first.to);

    var err = new Error(msg);
    err.diff    = self;
    err.key     = first.key;
    err.reason  = 'may not change';
    err.from    = first.from;
    err.to      = first.to;
    err.changes = bad_changes; // All of them.

    throw err;
  }
}

// Throw an exception unless all rules match a change.
function assert_atleast() {
  var self = this
    , all_rules = rules.make(true, arguments)

  var bad_rules = self.bad_rules(all_rules);
  var first = bad_rules[0];

  if(first) {
    var msg = 'Required: "' + first.key + '" ' + first.reason + ': ' + first.from + ' -> ' + first.to;

    var err = new Error(msg);
    err.diff    = self;
    err.key     = first.key;
    err.reason  = first.reason;
    err.from    = first.from;
    err.to      = first.to;
    err.rules   = bad_rules;

    throw err;
  }
}

// Throw an exception unless all changes match the rules.
function assert_atmost() {
  var self = this
    , all_rules = rules.make(true, arguments)

  var bad_changes = self.bad_changes(all_rules);
  var first = bad_changes[0];

  if(first) {
    var msg = 'Invalid change: "' + first.key + '" may not change: ' + lib.I(first.from) + ' -> ' + lib.I(first.to);

    var err = new Error(msg);
    err.diff    = self;
    err.key     = first.key;
    err.reason  = 'may not change';
    err.from    = first.from;
    err.to      = first.to;
    err.changes = bad_changes; // All of them.

    throw err;
  }
}


// Return a list of all changes not matching a rule.
function bad_changes(all_rules) {
  var self = this;

  if(DEFS.couchdb)
    all_rules.push( new rules.Rule('_id'             , 'must be a string'      , lib.GONE, String)
                  , new rules.Rule('_rev'            , 'must be a string'      , lib.GONE, String)
                  , new rules.Rule('_rev'            , 'may change as a string', String  , String)
                  , new rules.Rule('_revisions.start', 'must be a number'      , lib.GONE, Number)
                  , new rules.Rule('_revisions.ids'  , 'must be an array'      , lib.GONE, Array)
                  );

  console.error('bad_changes:\n' + lib.I({diff:self, rules:all_rules}));

  var misses = [];
  for (var key in self) {
    if(!self.hasOwnProperty(key))
      continue;

    var is_match = false;
    for(var a = 0; a < all_rules.length; a++)
      if(all_rules[a].match(key, self[key].from, self[key].to)) {
        is_match = true;
        break;
      }

    if(!is_match)
      misses.push({'key':key, 'from':self[key].from, 'to':self[key].to});
  }

  console.error(' :: ' + lib.I(misses))
  return misses;
}

// Return a list of all rules not matching a change.
function bad_rules(all_rules) {
  var self = this;
  console.error('bad_rules:\n' + lib.I({diff:self, rules:all_rules}));

  var misses = [];
  for(var a = 0; a < all_rules.length; a++) {
    var is_match = false;

    for (var key in self)
      if(self.hasOwnProperty(key))
        if(all_rules[a].match(key, self[key].from, self[key].to)) {
          is_match = true;
          break;
        }

    if(!is_match)
      misses.push(all_rules[a]);
  }

  return misses;
}


}) // defaultable
