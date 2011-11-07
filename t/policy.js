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
  , obj_diff = require('../api')
  ;

var JS = JSON.stringify
  , JP = JSON.parse
  , JDUP = function(x) { return JSON.parse(JSON.stringify(x)) }
  ;

var fixtures = {
  server: {
    _id: 'Server/foo'
  , _rev: '1-blah'
  , state: 'running' },

  transfer: {
    _id: 'Server/foo'
  , _rev: '1-blah'
  , state: 'transfer'
  , transfer: {"to":"Manager/somebody"}
  }
}

function make_tester(t) {
  return tester;

function tester(method, from_id, to_id, policy, expected) {
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

  method = method.replace(/^doc_diff_/, "");
  var result = obj_diff[method](from, to, policy);
  var message = "from="+JS(from) + " to="+JS(to) + " policy="+JS(policy);

  return t.same(result, expected, message);
}

}

test('At most', function(t) {
  var go = make_tester(t);

  go('doc_diff_atmost', 'server', 'server', {}, true);
  go('doc_diff_atmost', 'server', 'server', {}, true);
  go('doc_diff_atmost', 'server', 'server', {change: {}}, true);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {}, false);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {unrelated:{}}, false);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{}}, true);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{from:"won't match"}}, false);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{to:"won't match"}}, false);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{}}, true);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{from:true}}, true);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{to:undefined}}, true);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{from:true, to:undefined}}, true);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{from:666}}, false);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{to:null}}, false);
  go('doc_diff_atmost', {base:'server', reboot:true}, 'server', {reboot:{from:'badfrom',to:'badto'}}, false);

  // Adding and removing arrays.
  go('doc_diff_atmost', 'server', {base:'server', ar:['hi']}, {}, false);
  go('doc_diff_atmost', 'server', {base:'server', ar:['hi']}, {ar:{to:Array}}, true);
  go('doc_diff_atmost', {base:'server', ar:['yo']}, 'server', {ar:{from:Array}}, true);

  // Deleting keys.
  go('doc_diff_atmost', 'server', {base:'server', state:undefined}, {}, false);
  go('doc_diff_atmost', 'server', {base:'server', state:undefined}, {state:{}}, true);
  go('doc_diff_atmost', 'server', {base:'server', state:undefined}, {state:{to:undefined}}, true);
  go('doc_diff_atmost', 'server', {base:'server', state:undefined}, {state:{to:/.*/}}, false);

  // Deeper changes
  go('doc_diff_atmost', 'transfer', 'transfer', {}, true);
  go('doc_diff_atmost', 'transfer', {base:'transfer'}, {transfer:{to:{}}}, true);
  go('doc_diff_atmost', 'transfer', {base:'transfer', transfer:{to:null}}, {transfer:{nest:true, to:{}}}, true);

  t.end();
})

test('At least', function(t) {
  var go = make_tester(t);

  go('doc_diff_atleast', 'server', 'server', {}, true);
  go('doc_diff_atleast', 'server', 'server', {change: {}}, false);
  go('doc_diff_atleast', 'server', {base:'server', jason:'cool'}, {}, true);
  go('doc_diff_atleast', 'server', {base:'server', jason:'cool'}, {jason: {}}, true);
  go('doc_diff_atleast', {base:'server', jason:'cool'}, 'server', {jason: {}}, true);
  go('doc_diff_atleast', 'server', {base:'server', jason:'cool'}, {jason: {to:'not cool'}}, false);
  go('doc_diff_atleast', 'server', {base:'server', jason:'cool'}, {jason: {from:undefined, to:/.*/}}, true);

  // Deeper change
  go('doc_diff_atleast', 'transfer', 'transfer', {}, true);
  go('doc_diff_atleast', 'transfer', {base:'transfer', transfer:{to:null}}, {transfer:{to:{}, nest:1}}, true);
  go('doc_diff_atleast', 'transfer', {base:'transfer', transfer:{to:23}}, {transfer:{nest:true, to:{}}}, true);
  go('doc_diff_atleast', 'transfer', {base:'transfer', transfer:{to:null}}, {transfer:{nest:true, to:{}}}, true);

  t.throws(function() {
    go('doc_diff_atmost', {base:'server', reboot:false}, 'server', {reboot:{from:undefined, to:undefined}}, true);
  }, 'Undefined from and to')

  t.end();
})
