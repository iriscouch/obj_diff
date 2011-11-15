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
  , _test = test, noop = function() {} // for activating/deactivating tests
  , util = require('util')
  , obj_diff = require('../api')
  , doc_diff = require('../api').defaults({couchdb:true})
  //, ast_diff = require('../api').defaults({assert:true})
  , ANY    = obj_diff.ANY
  , GONE   = obj_diff.GONE
  , TRUTHY = obj_diff.TRUTHY
  , FALSY  = obj_diff.FALSY
  ;

test('No change', function(t) {
  var obj = {foo:['bar', {baz:'quux'}]};
  var diff = obj_diff(obj, obj);

  t.equal(diff.nochange(), true, 'nochange detects no change')
  t.doesNotThrow(function() {
    diff.assert_nochange();

    //diff = ast_diff(obj, obj);
    //diff.nochange();
  }, 'nochange assertions do not throw for unchanged data')

  diff = obj_diff({foo:'bar'}, {foo:'bar'});
  t.equal(diff.nochange('foo', 'this should be ignored', 'bar', 'new bar value'),
          true, 'nochange detects no change and ignores extra arguments');

  t.doesNotThrow(function() {
    diff.assert_nochange('foo', 'this should also be ignored', 'bar', 'new ignored bar value');

    //diff = ast_diff(obj, obj);
    //diff.nochange('foo', 'ignored again', 'bar', 'also also ignored');
  }, 'nochange assertions with arguments do not throw for unchanged data')

  t.end()
})

test('At most', function(t) {
  var pass = make_tester('atmost', 'pass', t);
  var fail = make_tester('atmost', 'fail', t);

  pass('No change, no policy', server(), server())
  pass('No change, unused policy', server(), server(), 'some_key', 'oldval', 'newval')

  fail('Unspecified delete', server({reboot:true}), server())
  fail('Unspecified add'   , server(), server({reboot:true}))
  fail('Unmatched rule', server({reboot:true}), server(), 'unrelated', ANY, ANY)

  pass('Good explicit rule match', server({reboot:true}), server({reboot:false}), 'reboot', true, false)
  pass('Good alias rule match 1' , server({reboot:true}), server({reboot:false}), 'reboot', TRUTHY, false)
  pass('Good alias rule match 2' , server({reboot:true}), server({reboot:false}), 'reboot', true, FALSY)
  pass('Good alias rule match 3' , server({reboot:true}), server({reboot:false}), 'reboot', TRUTHY, FALSY)

  fail('Bad rule match 1' , server({reboot:true}), server({reboot:false}), 'reboot', true, 'false')
  fail('Bad rule match 2' , server({reboot:true}), server({reboot:false}), 'reboot', 'true', false)

  pass('Change, unused policy', server(), server({new:true}), 'unrelated', 'old val', 'new val'
                                                            , 'new'      , GONE     , true)

  fail('Good change, bad change', server({val:1, oops:1}), server({val:2, oops:2})
                                , 'val' , 1, 2
                                , 'oops', 1, GONE)

  t.end();
})

test('At least', function(t) {
  var pass = make_tester('atleast', 'pass', t);
  var fail = make_tester('atleast', 'fail', t);

  pass('No change, no policy', server(), server())
  fail('No change, specified policy', server(), server(), 'some_key', 'oldval', 'newval')

  pass('Unspecified delete', server({reboot:true}), server())
  pass('Unspecified add'   , server(), server({reboot:true}))
  fail('Unmatched rule', server({reboot:true}), server(), 'unrelated', ANY, ANY)

  pass('Good explicit rule match', server({reboot:true}), server({reboot:false}), 'reboot', true, false)
  pass('Good alias rule match 1' , server({reboot:true}), server({reboot:false}), 'reboot', TRUTHY, false)
  pass('Good alias rule match 2' , server({reboot:true}), server({reboot:false}), 'reboot', true, FALSY)
  pass('Good alias rule match 3' , server({reboot:true}), server({reboot:false}), 'reboot', TRUTHY, FALSY)

  fail('Bad rule match 1' , server({reboot:true}), server({reboot:false}), 'reboot', true, 'false')
  fail('Bad rule match 2' , server({reboot:true}), server({reboot:false}), 'reboot', 'true', false)

  fail('Change, unused policy', server(), server({new:true}), 'unrelated', 'old val', 'new val'
                                                            , 'new'      , GONE     , true)

  fail('Good change, bad change', server({val:1, oops:1}), server({val:2, oops:2})
                                , 'val' , 1, 2
                                , 'oops', 1, GONE)
  t.end();
})

test('CouchDB exceptions', function(t) {
  var obj_fail = make_tester('atmost', 'fail', t);
  var doc_fail = make_tester('atmost', 'fail', t, doc_diff);
  var doc_pass = make_tester('atmost', 'pass', t, doc_diff);

  changes().forEach(function(change) {
    var oldval = change.oldDoc ? change.oldDoc.val : GONE;
    var newval = change.newDoc.val;

    doc_fail('CouchDB '+change.type+' fail normally', change.oldDoc, change.newDoc, 'otherval', 'should', 'fail')
    doc_pass('CouchDB '+change.type+' passes', change.oldDoc, change.newDoc, 'val', oldval, newval);

    if(change.type == 'replication')
      obj_fail('CouchDB replication fails atmost', change.oldDoc, change.newDoc, 'val', oldval, newval)
  })

  t.end()

  function changes() { return (
    [ { type: 'create'
      , oldDoc: null
      , newDoc: { _id: "mydoc"
                , val: "some value"
                , _revisions: { start:0
                              , ids  :[]
                              }
                }
      }

    , { type: 'update'
      , oldDoc: { _id : "mydoc"
                , _rev: "1-5c5750951411b5634ed2c478956a7900"
                , val : "some value"
                ,_revisions: { start: 1
                             , ids  : ["5c5750951411b5634ed2c478956a7900"]
                             }
                }
      , newDoc: { _id : "mydoc"
                , _rev: "1-5c5750951411b5634ed2c478956a7900"
                , val : "new value"
                , _revisions: { start: 1
                              , ids  : ["5c5750951411b5634ed2c478956a7900"]
                              }
                }
      }

    , { type: 'replication'
      , oldDoc: { _id : "mydoc"
                , _rev: "2-8d025da253fcf3927c0b81647dd4813a"
                , val : "new value"
                , _revisions: { start: 2
                              , ids  : [ "8d025da253fcf3927c0b81647dd4813a"
                                       , "5c5750951411b5634ed2c478956a7900"
                                       ]
                              }
                }
      , newDoc: { _id : "mydoc"
                , _rev: "4-2d88d505803f5b351e3b407dbf4ae873"
                , val : "fourth value"
                , _revisions: { start: 4
                              , ids  : [ "2d88d505803f5b351e3b407dbf4ae873"
                                       , "d9f55f665c2deccad2aa54b796014cf8"
                                       , "8d025da253fcf3927c0b81647dd4813a"
                                       , "5c5750951411b5634ed2c478956a7900"
                                       ]
                              }
                }
      }

    , { type: 'replication to missing doc id'
      , oldDoc: null
      , newDoc: { _id : "clean"
                , _rev: "3-1a5cf830ad65d6b8cc2963ab9ce0209b"
                , val : "third"
                , _revisions: { start: 3
                              , ids  : [ "1a5cf830ad65d6b8cc2963ab9ce0209b"
                                       , "32ca7d6ad69aeeae5842dc68e9b959f3"
                                       , "53f08fe3baccc045611cf9e3809981f3"
                                       ]
                              }
                }
      }
    ])
  } // changes
})

test('Utility functions', function(t) {
  var a = server();
  var b = server();

  t.same(a, b, 'Server generator makes congruent objects');
  t.isNot(a, b, 'Server generator makes unique objects');

  t.end();
})

//
// Utilities
//

function make_tester(method, assertion, t, diff_mod) {
  diff_mod = diff_mod || obj_diff;
  //var asserts_diff_mod = diff_mod.defaults({assert:true});

  return tester(assertion == 'pass');

  function tester(expected) {
    return function(message, a, b) {
      var policy = Array.prototype.slice.call(arguments, 3);

      // assert_atmost, assert_atleast, etc. have an extra parameter.
      var asserting_policy = [];
      for(var i = 0; i < policy.length; i++) {
        asserting_policy.push(policy[i]);
        if(i % 3 == 0)
          asserting_policy.push(message);
      }

      message = [ message
                , JSON.stringify(a)
                , '->'
                , JSON.stringify(b)
                , "policy=" + util.inspect(policy)
                ].join(' ');

      var diff = diff_mod(a, b);
      var result = diff[method].apply(diff, policy);

      t.equal(result, expected, message);

      if(expected) {
        t.doesNotThrow(assert_with_method, 'Assertion method pass: ' + message);
        //t.doesNotThrow(assert_with_module, 'Assertion module pass: ' + message);
      } else {
        t.throws(assert_with_method, 'Asserting ' + message);
        //t.throws(assert_with_module, 'Assertion module fail: ' + message);
      }

      function assert_with_method() {
        var assert_method = 'assert_' + method;
        console.error('What to do: ' + util.inspect(asserting_policy));
        diff[assert_method].apply(diff, asserting_policy);
      }

      function assert_with_module() {
        var asserting_diff = asserts_diff_mod(a, b);
        asserting_diff[method].apply(diff, asserting_policy);
      }
    }
  }
}
//function tester(t, expected, diff_mod) {
//  diff_mod = diff_mod || obj_diff;
//
//  return function(message, from, to, key, oldval, newval) {
//    // Round-trip through JSON to make sure it's JSON-storable.
//    var diff_0 = diff_mod(from, to);

function add(extra, obj) {
  extra = extra || {};
  for (var k in extra) {
    if(typeof obj[k] == 'object' && typeof extra[k] == 'object')
      obj[k] = add(extra[k], obj[k])
    else
      obj[k] = extra[k];
  }
  return obj;
}

function server(extra) {
  return add(extra, { _id: 'Server/foo'
                    , _rev: '1-blah'
                    , state: 'transfer'
                    , transfer: {"to":"Manager/somebody"}
                    , backups: [ {ok:true , date:"2011-11-13T02:03:08.971Z"}
                               , {ok:false, date:"2011-10-13T02:03:08.971Z"}
                               ]
                    });
}
