// Just experimenting with converting the _users validator

function(newDoc, oldDoc, userCtx, secObj) {
    var doc_diff = require('obj_diff').defaults({couchdb:true})
      , ANY      = doc_diff.ANY
      , GONE     = doc_diff.GONE
      , diff     = doc_diff(oldDoc, newDoc)
      ;

    if (newDoc._deleted === true) {
        // allow deletes by admins and matching users
        // without checking the other fields
        if ((userCtx.roles.indexOf('_admin') !== -1) ||
            (userCtx.name == oldDoc.name)) {
            return;
        } else {
            throw({forbidden: 'Only admins may delete other user docs.'});
        }
    }

    if ((oldDoc && oldDoc.type !== 'user') || newDoc.type !== 'user') {
    } // we only allow user docs for now

    // GONE rules in at-most checks are very useful. During document creation, oldDoc has no
    // previous fields. The GONE rules will match and force that field to be created correctly.
    // Subsequent updates will *change* the field, so the GONEs will no longer apply.

    function no_system_roles(roles) {
      for (var i = 0; i < roles.length; i++)
        if(roles[i][0] === '_')
          return false; // No system roles (starting with underscore) in users db.
      return true;
    }

    var required = [];

    if(diff.roles)

    if(diff.roles)
    var required =
    [ 'name' , ANY, String // doc.name is required.

    })
    ];

    var allowed =
    [ 'roles', 'must be an array'                        , ANY , Array
    allowed.push('roles', ANY, no_system_roles);
    , '_id' , 'must be of the form org.couchdb.user:name', GONE, 'org.couchdb.user:'+newDoc.name
    , 'name', 'can not be changed'                       , GONE, newDoc.name
    , 'type' , 'must be user', GONE, 'user'
        throw({forbidden : 'doc.type must be user'});
    , 'name', 'may not start with underscore', ANY, /^[^_]/
    ];

    if(newDoc.password_sha) {
      required.push('password_sha', ANY, String); // Users with password_sha...
      required.push('salt'        , ANY, String); // ...must have a salt.
    }

    try {
      diff.assert.atleast(required);
      diff.assert.atmost(allowed);
    } catch (failure) {
      throw({forbidden: failure.message});
    }

    if(userCtx.roles.indexOf('_admin') !== -1) {
      allowed.push('roles', Array, Array);
    } else {
      // Validate non-admin updates.
      allowed.push('name', GONE, userCtx.name); // You may only update your own user document.

      // It appears that users may re-arrange their roles order.
      allowed.push('roles', Array, function(newRoles, oldRoles) {
        if(oldRoles.length !== newRoles.length)
          return false;

        for (var i = 0; i < newRoles.length; i++) {
          if(oldRoles.indexOf(newRoles[i]) === -1)
            return false;
        }

        return true;
      })
    }


    // no system names as names
    if (newDoc.name[0] === '_') {
        throw({forbidden: 'Username may not start with underscore.'});
    }

    // Test it all!
    diff.assert.atleast(required);
    diff.assert.atmost(allowed);
}
