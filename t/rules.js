// obj_diff policy tests
//
// Copyright 2011 Iris Couch
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var test = require('tap').test
  , util = require('util')
  , I = function(obj) { return util.inspect(obj, false, 10) }
  , obj_diff = require('../api')
  , rules = require('../lib/rules')
  ;

var ANY = obj_diff.ANY;
var GONE = obj_diff.GONE;
var TRUTHY = obj_diff.TRUTHY;
var FALSY  = obj_diff.FALSY;

test('Aliases', function(t) {
  var pass = tester(t, true);
  var fail = tester(t, false);

  t_alias(ANY, pass, 'ANY matches negative numbers', -1.5, 0)
  t_alias(ANY, pass, 'ANY matches positive numbers', 0, 1.5)
  t_alias(ANY, pass, 'ANY matches a string', 'a string', 'another string')
  t_alias(ANY, pass, 'ANY matches a boolean', true, false)
  t_alias(ANY, pass, 'ANY matches an array', [1,2], ['a','b'])

  pass('ANY matches an object (from)', {val:{obj:'ect'}}, {val:'foo'}, 'val', ANY, 'foo')
  pass('ANY matches an object (to)'  , {val:'foo'}, {val:{obj:'ect'}}, 'val', 'foo', ANY)

  pass('ANY matches GONE (to)'  , {togo:'I will go'}, {}, 'togo', 'I will go', ANY)
  pass('ANY matches GONE (from)', {}, {came:'I came'}, 'came', ANY, 'I came')

  t.end();

  // Test an alias in to, from, and both positions.
  function t_alias(alias, tester, message, oldVal, newVal) {
    var key = 'test_' + JSON.stringify(alias).replace(/[^\w]/g, '').toUpperCase();

    var oldObj = {}, newObj = {};
    oldObj[key] = oldVal;
    newObj[key] = newVal;

    tester(message + ' (to)'  , oldObj, newObj, key, oldVal, alias )
    tester(message + ' (from)', oldObj, newObj, key, alias , newVal)
    tester(message + ' (both)', oldObj, newObj, key, alias , alias )
  }
})

test('Type matching', function(t) {
  var pass = tester(t, true);
  var fail = tester(t, false);

  pass('"Gone" type', {}, {peeka:'boo'}, 'peeka', GONE, 'boo')
  pass('String type', {}, {peeka:'boo'}, 'peeka', GONE, String)
  pass('Object type', {}, {peek:{a:"boo"}}, 'peek', GONE, Object)
  pass('Array type' , {}, {peek:['a','boo']}, 'peek', GONE, Array)

  pass('null type', {isnull:null}, {isnull:'nil'}, 'isnull', null, 'nil')

  pass('undefined type', {undef:undefined}, {undef:'defined'}, 'undef', undefined, 'defined')

  pass('Negative number type', {}, {peeka:-2.5 }, 'peeka', GONE, Number)
  pass('Zero number type'    , {}, {peeka:0    }, 'peeka', GONE, Number)
  pass('Positive type'       , {}, {peeka:2.5  }, 'peeka', GONE, Number)

  pass('Boolean type', {}, {peeka:true} , 'peeka', GONE, Boolean)
  pass('Boolean type', {}, {peeka:false}, 'peeka', GONE, Boolean)

  t.end()
})

test('Rule matching', function(t) {
  var pass = tester(t, true);
  var fail = tester(t, false);

  fail('Unexpected delete', {reboot:true}, {}, 'unrelated', 'rule', 'here')
  pass('Expected delete'  , {reboot:true}, {}, 'reboot'   , ANY   , GONE)

  fail('Unexpected add'   , {}, {reboot:true}, 'unrelated', 'rule', 'here')
  pass('Expected add'     , {}, {reboot:true}, 'reboot'   , GONE  , ANY)

  fail('Unexpected change', {reboot:true}, {reboot:false}, 'unrelated', 'rule', 'here')
  pass('Expected change'  , {reboot:true}, {reboot:false}, 'reboot', true, false)

  fail('Unexpected type change', {name:'Alice'}, {name:null}, 'unrelated', 'rule', 'here')
  pass('Expected type change'  , {name:'Alice'}, {name:null}, 'name', String, null)

  fail('Unrelated rule', {age:23}, {}, 'unrelated', ANY, ANY)

  pass('Match any/any', {reboot:true}, {}, 'reboot', ANY, ANY)
  pass('Match hit/any', {reboot:true}, {}, 'reboot', true, ANY)
  pass('Match any/hit', {reboot:true}, {}, 'reboot', ANY, GONE)
  pass('Match hit/hit rule', {reboot:true}, {}, 'reboot', true, GONE)

  fail('false is not true', {}, {good:false}, 'good', ANY, true)
  fail('true is not false', {}, {good:true}, 'good', ANY, false)

  fail('"true" is not true', {reboot:true}, {}, 'reboot', 'true', ANY)
  fail('Number is not true', {reboot:true}, {}, 'reboot', 23    , ANY)

  fail('"false" is not false', {}, {happy:false}, 'happy', ANY, 'false')
  fail('0 is not false'      , {}, {happy:false}, 'happy', ANY, 0)

  t.end()
})

test('Falsy types', function(t) {
  var pass = tester(t, true);
  var fail = tester(t, false);

  pass('undefined is undefined', {age:99}, {age:undefined}, 'age', 99, undefined)
  fail('undefined is not null' , {age:99}, {age:undefined}, 'age', 99, null)

  fail('undefined is not 0'    , {age:99}, {age:undefined}, 'age', 99, 0)
  fail('undefined is not false', {age:99}, {age:undefined}, 'age', 99, false)
  fail('undefined is not gone' , {age:99}, {age:undefined}, 'age', 99, GONE)

  fail('null is not undefined', {use:null}, {use:'Y'}, 'use', undefined, 'Y')
  pass('null is null'         , {use:null}, {use:'Y'}, 'use', null     , 'Y')
  fail('null is not 0'        , {use:null}, {use:'Y'}, 'use', 0        , 'Y')
  fail('null is not false'    , {use:null}, {use:'Y'}, 'use', false    , 'Y')
  fail('null is not gone'     , {use:null}, {use:'Y'}, 'use', GONE     , 'Y')

  fail('0 is not undefined', {money:1}, {money:0}, 'money', 1, undefined)
  fail('0 is not null'     , {money:1}, {money:0}, 'money', 1, null)
  pass('0 is 0'            , {money:1}, {money:0}, 'money', 1, 0)
  fail('0 is not false'    , {money:1}, {money:0}, 'money', 1, false)
  fail('0 is not gone'     , {money:1}, {money:0}, 'money', 1, GONE)

  fail('false is not undefined', {cool:false}, {cool:'breeze'}, 'cool', undefined, 'breeze')
  fail('false is not null'     , {cool:false}, {cool:'breeze'}, 'cool', null, 'breeze')
  fail('false is not 0'        , {cool:false}, {cool:'breeze'}, 'cool', 0, 'breeze')
  pass('false is false'        , {cool:false}, {cool:'breeze'}, 'cool', false, 'breeze')
  fail('false is not gone'     , {cool:false}, {cool:'breeze'}, 'cool', GONE, 'breeze')

  fail('gone is not undefined', {hi:'world'}, {}, 'hi', 'world', undefined)
  fail('gone is not null'     , {hi:'world'}, {}, 'hi', 'world', null)
  fail('gone is not 0'        , {hi:'world'}, {}, 'hi', 'world', 0)
  fail('gone is not false'    , {hi:'world'}, {}, 'hi', 'world', false)
  pass('gone is gone'         , {hi:'world'}, {}, 'hi', 'world', GONE)

  t.end()
})

// TODO: nochange

//
// Utilities
//

function tester(t, expected) {
  return function(message, from, to, key, oldval, newval) {
    // Round-trip through JSON to make sure it's JSON-storable.
    var diff_0 = obj_diff(from, to);
    var diff_j = JSON.stringify(diff_0);
    //console.error('Diff JSON: ' + I(diff));
    var diff = new obj_diff.Diff(JSON.parse(diff_j));
    //console.error('RT Diff: ' + I(diff));
    t.same(diff, diff_0, 'Diff JSON round-trip: ' + diff_j);

    var changed_keys = Object.keys(diff);
    t.equal(changed_keys.length, 1, 'Rule tests should have only one change: ' + JSON.stringify(diff));

    var change_key  = changed_keys[0];
    var change_from = diff[change_key].from;
    var change_to   = diff[change_key].to;

    // Round-trip through JSON to make sure it's JSON-storable.
    var rule_0 = new rules.Rule(key, oldval, newval);
    //console.error('Before: ' + I(rule))
    var rule_j = JSON.stringify(rule_0);
    //console.error('JSON: ' + I(rule))
    var rule = new rules.Rule(JSON.parse(rule_j));
    //console.error('After: ' + I(rule))
    t.same(rule, rule_0, 'Rule JSON round-trip: ' + rule_j);

    var result = rule.match(change_key, change_from, change_to);
    t.equal(result, expected, message);
  }
}
