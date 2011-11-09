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

function make_testers(method, t) {
  return { 'pass': tester(true)
         , 'fail': tester(false)
         };

  function tester(expected) {
    return function(message, a, b) {
      var policy = Array.prototype.slice.call(arguments, 3);

      var diff, result;
      message = [ message
                , JSON.stringify(a)
                , ' -> '
                , JSON.stringify(b)
                , "policy=" + util.inspect(policy)
                ].join(' ');

      diff = obj_diff(a, b);
      result = diff[method].apply(diff, policy);
      t.equal(result, expected, message);

      diff = obj_diff(a, b, {assert:true});
      function go() { diff[method].apply(diff, policy) }
      if(expected)
        t.doesNotThrow(go, 'No throw: ' + message)
      else
        t.throws(go, 'Throws: ' + message);
    }
  }
}

test('Utility functions', function(t) {
  var a = server();
  var b = server();

  t.same(a, b, 'Server generator makes congruent objects');
  t.isNot(a, b, 'Server generator makes unique objects');

  t.end();
})

test('At most', function(t) {
  var testers = make_testers('atmost', t)
    , pass = testers.pass
    , fail = testers.fail
    ;

  pass('No change, no policy', server(), server())
  pass('No change, unused policy', server(), server(), 'some_key', 'oldval', 'newval')

  fail('Unexpected delete', server({reboot:true}), server())
  fail('Unexpected add'   , server(), server({reboot:true}))
  fail('Unrelated rule', server({reboot:true}), server(), 'unrelated', ANY, ANY)

  pass('Match any/any rule', server({reboot:true}), server(), 'reboot', ANY, ANY)
  pass('Match hit/any rule', server({reboot:true}), server(), 'reboot', true, ANY)
  pass('Match hit/hit rule', server({reboot:true}), server(), 'reboot', true, ['gone'])

  fail('"true" is not true', server({reboot:true}), server(), 'reboot', 'true', ANY)
  
  fail('Null is not undefined', server({reboot:true}), server({reboot:null}), 'reboot', true, 

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

function xxmake_tester(method, t) {
  return function(from_id, to_id, policy, expected) {
    var from_merge = {}, to_merge = {};

    if(typeof from_id == 'object') {
      from_merge = from_id;
      from_id = from_merge.base;
      delete from_merge.base;
    }
    if(typeof to_id == 'object') {
      to_merge = to_id;
      to_id = to_merge.base;
      delete to_merge.base;
    }

    var from = JSON.parse(JSON.stringify(fixtures[from_id]));
    var to   = JSON.parse(JSON.stringify(fixtures[to_id]));

    var k;
    for(k in from_merge) {
      if(from_merge[k] === undefined)
        delete from[k];
      else
        from[k] = from_merge[k];
    }

    for(k in to_merge) {
      if(to_merge[k] === undefined)
        delete to[k];
      else
        to[k] = to_merge[k];
    }

    var result = obj_diff[method](from, to, policy);
    var message = [ "from="   + JSON.stringify(from)
                  , "to="     + JSON.stringify(to)
                  , "policy=" + JSON.stringify(policy)
                  ].join(' ');

    return t.same(result, expected, message);
  }

}

//
// Utilities
//

function add(extra, obj) {
  extra = extra || {};
  for (var k in extra)
    obj[k] = extra[k];
  return obj;
}

function server(extra) {
  return add(extra, { _id: 'Server/foo'
                    , _rev: '1-blah'
                    , state: 'running'
                    });
}

function transfer(extra) {
  return add(extra, { _id: 'Server/foo'
                    , _rev: '1-blah'
                    , state: 'transfer'
                    , transfer: {"to":"Manager/somebody"}
                    });
}

function ANY() {
  return true;
}
