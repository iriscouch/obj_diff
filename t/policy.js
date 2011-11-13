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
  , obj_diff = require('../api')
  , ANY    = obj_diff.ANY
  , GONE   = obj_diff.GONE
  , TRUTHY = obj_diff.TRUTHY
  , FALSY  = obj_diff.FALSY
  ;

test('No change', function(t) {
  var obj = {foo:['bar', {baz:'quux'}]};
  var diff = obj_diff(obj, obj);

  t.equal(diff.nochange(), true, 'nochange detects no change');

  diff = obj_diff({foo:'bar'}, {foo:'bar'});
  t.equal(diff.nochange('foo', 'this should be ignored', 'bar', 'new bar value'),
          true, 'nochange detects no change and ignores extra arguments');

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

function make_tester(method, assertion, t) {
  return tester(assertion == 'pass');

  function tester(expected) {
    return function(message, a, b) {
      var policy = Array.prototype.slice.call(arguments, 3);

      message = [ message
                , JSON.stringify(a)
                , ' -> '
                , JSON.stringify(b)
                , "policy=" + util.inspect(policy)
                ].join(' ');

      var diff = obj_diff(a, b);
      var result = diff[method].apply(diff, policy);
      t.equal(result, expected, message);
    }
  }
}

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
