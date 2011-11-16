var fs = require('fs')
  , path = require('path')
  , couchapp = require('couchapp')
  ;


function read(path) { return fs.readFileSync(__dirname + '/../' + path, 'utf8') }


var ddoc = module.exports = { _id:'_design/obj_diff' };

ddoc.path = read('CouchDB/path.js');
ddoc.util = read('CouchDB/util.js');
ddoc.assert = read('CouchDB/assert.js');
ddoc.defaultable = read('node_modules/defaultable/defaultable.js');

ddoc.obj_diff = read('api.js');
ddoc.lib = { 'index': read('lib/index.js')
           , 'diffs': read('lib/diffs.js')
           , 'rules': read('lib/rules.js')
           }

ddoc.validate_doc_update = function(newDoc, oldDoc, userCtx, secObj) {
  var doc_diff = require('obj_diff').defaults({couchdb:true})
    , _        = doc_diff
    , diff = doc_diff(oldDoc, newDoc);

  diff.assert_atleast(
    'updated_at', 'Must change', _.ANY, _.TIMESTAMP
  );

  diff.assert_atmost(
    'created_at', 'Must be equal to created_at', _.GONE, newDoc.created_at
  , 'created_at', 'Must be greater than before', _.TIMESTAMP, _.GREATER
  , 'str'       , 'Must be a string'           , _.ANY, String
  , 'num'       , 'Must be a number'           , _.ANY, Number
  );
}

ddoc.shows = {};
ddoc.shows.ui = function(doc, req) {
  var ddoc = this;
  var I = JSON.stringify;

  log(req.query);

  var response = {'headers': {}};

  provides('html', function() {
    var mods = ['defaultable', 'obj_diff'];
    var result = [];

    for(var a = 0; a < mods.length; a++) {
      var mod_name = mods[a];

      try {
        var mod = require(mod_name);
        result.push(mod_name + ' = ' + JSON.stringify(mod));
      } catch(er) {
        var e = er[2].replace(/^.*raised error (\[.*\]).*$/, '$1');
        log(e);
        //result.push(mod_name + ' error: ' + typeof e);
        result.push(mod_name + ' ' + JSON.parse(er[2].replace(/^.*raised error (\[.*\]).*$/, '$1')));
        break;
      }
    }

    response.body = '<html><body><pre><code>' + result.join('<br>') + '</code></pre></body></html>\n';
    //response.body = result.join('\n') + '\n';
    return response;
  })
} // shows.ui

if(require.main === module)
  console.log('ok');
