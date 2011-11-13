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

if(0)
test('At most', function(t) {
  var pass = make_tester('atmost', 'pass', t);
  var fail = make_tester('atmost', 'fail', t);

  pass('No change, no policy', server(), server())
  pass('No change, unused policy', server(), server(), 'some_key', 'oldval', 'newval')

  fail('Unexpected delete', server({reboot:true}), server())
  fail('Unexpected add'   , server(), server({reboot:true}))
  fail('Unrelated rule', server({reboot:true}), server(), 'unrelated', ANY, ANY)

  pass('Match any/any rule', server({reboot:true}), server(), 'reboot', ANY, ANY)
  pass('Match hit/any rule', server({reboot:true}), server(), 'reboot', true, ANY)
  pass('Match hit/hit rule', server({reboot:true}), server(), 'reboot', true, ['gone'])

  fail('"true" is not true', server({reboot:true}), server(), 'reboot', 'true', ANY)

  //fail('Null is not undefined', server({reboot:true}), server({reboot:null}), 'reboot', true, 

  //go({base:'server', reboot:true}, 'server', {reboot:{}}, true);
  //go({base:'server', reboot:true}, 'server', {reboot:{from:"won't match"}}, false);
  //go({base:'server', reboot:true}, 'server', {reboot:{to:"won't match"}}, false);
  //go({base:'server', reboot:true}, 'server', {reboot:{}}, true);
  //go({base:'server', reboot:true}, 'server', {reboot:{from:true}}, true);
  //go({base:'server', reboot:true}, 'server', {reboot:{to:undefined}}, true);
  //go({base:'server', reboot:true}, 'server', {reboot:{from:true, to:undefined}}, true);
  //go({base:'server', reboot:true}, 'server', {reboot:{from:666}}, false);
  //go({base:'server', reboot:true}, 'server', {reboot:{to:null}}, false);
  //go({base:'server', reboot:true}, 'server', {reboot:{from:'badfrom',to:'badto'}}, false);

  // Adding and removing arrays.
  //go('server', {base:'server', ar:['hi']}, {}, false);
  //go('server', {base:'server', ar:['hi']}, {ar:{to:Array}}, true);
  //go({base:'server', ar:['yo']}, 'server', {ar:{from:Array}}, true);

  // Deleting keys.
  //go('server', {base:'server', state:undefined}, {}, false);
  //go('server', {base:'server', state:undefined}, {state:{}}, true);
  //go('server', {base:'server', state:undefined}, {state:{to:undefined}}, true);
  //go('server', {base:'server', state:undefined}, {state:{to:/.*/}}, false);

  // Deeper changes
  //go('transfer', 'transfer', {}, true);
  //go('transfer', {base:'transfer'}, {transfer:{to:{}}}, true);
  //go('transfer', {base:'transfer', transfer:{to:null}}, {transfer:{nest:true, to:{}}}, true);

  t.end();
})

if(0)
test('At least', function(t) {
  var go = make_tester('atleast', t);

  go('server', 'server', {}, true);
  go('server', 'server', {change: {}}, false);
  go('server', {base:'server', jason:'cool'}, {}, true);
  go('server', {base:'server', jason:'cool'}, {jason: {}}, true);
  go({base:'server', jason:'cool'}, 'server', {jason: {}}, true);
  go('server', {base:'server', jason:'cool'}, {jason: {to:'not cool'}}, false);
  go('server', {base:'server', jason:'cool'}, {jason: {from:undefined, to:/.*/}}, true);

  // Deeper change
  go('transfer', 'transfer', {}, true);
  go('transfer', {base:'transfer', transfer:{to:null}}, {transfer:{to:{}, nest:1}}, true);
  go('transfer', {base:'transfer', transfer:{to:23}}, {transfer:{nest:true, to:{}}}, true);
  go('transfer', {base:'transfer', transfer:{to:null}}, {transfer:{nest:true, to:{}}}, true);

  t.throws(function() {
    go({base:'server', reboot:false}, 'server', {reboot:{from:undefined, to:undefined}}, true);
  }, 'Undefined from and to')

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
