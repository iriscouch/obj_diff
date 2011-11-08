// obj_diff API tests
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

function make_tester(t) {
  return go;
  function go(a, b, expected) {
    var diff = obj_diff(a, b);

    var message = [ "from="   + JSON.stringify(a)
                  , "to="     + JSON.stringify(b)
                  , "expect=" + JSON.stringify(expected)
                  ].join(' ');

    t.same(diff, expected, message);
  }
}

test('Diff objects', function(t) {
  var go = make_tester(t);

  go({}, {}, {})
  go({a:1}, {a:1}, {})
  go({}, {foo:'bar'}, {foo: {from:['undefined'], to:'bar'}})
  go({foo:'bar'}, {}, {foo: {from:'bar', to:['undefined']}})
  go({a:1}, {a:"1"}, {a: {from:1, to:"1"}})
  go({a:1}, {b:1}, {a: {from:1, to:['undefined']}, b: {from:['undefined'], to:1}})
  go({}, {obj:{hi:true}}, {obj: {from:['undefined'], to:{hi:true}}})
  go({first:{second:{value:false}}}, {first:{second:{value:true}}}, {first:{second:{value:{from:false, to:true}}}})

  t.end();
})

test('README examples', function(t) {
  var go = make_tester(t);

  go({x:'hi'}, {x:'bye'},
     {x: {from:'hi', to:'bye'}})

  go({name:"Joe", word:"hi"}, {name:"Joe", word:"bye"},
     { word: { from: 'hi', to: 'bye' } })

  go({name:"Joe", contact: {email:"doe@example.com"}},
     {name:"Joe", contact: {email:"doe@example.com", cell:"555-1212"}},
     { contact: { cell: { from: ['undefined'], to: '555-1212' } } })

  go({name:"Joe", contact: {email:"doe@example.com", cell:null      }},
     {name:"Joe", contact: {email:"doe@example.com", cell:"555-1212"}},
     { contact: { cell: { from: null, to: '555-1212' } } })

  t.end();
})
