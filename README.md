# Identify and assert required and allowed differences betwen objects

obj_diff is a simple utility to ascertain and assert the differences between Javascript and JSON objects. It is useful for

1. Seeing how an object has changed
2. Deciding whether that change is good or bad.

Thus obj_diff is very useful for security and validation.

## Is it any good?

Yes.

## Objectives

To be useful in databases and database applications, obj_diff has a few design goals:

* **Declarative assertion**. Input validation has important correctness and security implications. It must be easy to understand and to express clearly and correctly which changes are allowed.
* **JSON compatible**. Regular expressions and function callbacks are useful as validation rules. obj_diff ensures that these survive a round-trip through JSON encoding.

## Usage

obj_diff is available as an NPM package.

    npm install obj_diff

The API is pretty simple:

```javascript
var obj_diff = require("obj_diff");

var original = { hello:"world" };
var modified = { hello:"everybody", extra:{"nice":"to see you"} };

var diff = obj_diff(original, modified);
```

### atleast(): Check for mandatory changes

*atleast* returns `true` or `false` if the specified changes (and possibly more) happened.

```javascript
// Just give a key name, old value, new value
diff.atleast("some_key", "old_value", "new_value");

// For nested objects, just type them out in the string.
diff.atleast("options.production.log.level", "debug", "info");

// Use regular expressions to check strings. E.g, name must start with "S"
diff.atleast("name", diff.ANY, /^S/);

// Use function callbacks (predicates) to check values arbitrarily.
function good_weapon(weapon) {
  return weapon != process.env.bad_weapon;
}

diff.atleast("weapon", diff.ANY, good_weapon);

// Specify multiple changes in one array.
diff.atleast([ "some_key", "old_value", "new_value"
             , "options.production.log.level", "debug", "info"
             , "name", diff.ANY, /^S/
             , "weapon", diff.ANY, good_weapon
             ]);
```

### atmost(): Check for approved changes

*atmost* returns `true` or `false` if the specified changes (and possibly fewer) happened.

```javascript
// Often, you specify multiple rules in a list.
diff.atmost([

  // Changing my weapon is fine.
  "weapon", diff.ANY, good_weapon,

  // Changing my first name to something readable is fine.
  "name.first", diff.ANY, /^\w+$/,

  // People named "Smith" may change their last name.
  "name.last", "Smith", /^\w+$/,

  // Middle must be just an initial.
  "name.middle", diff.ANY, /^\w$/

]);
```

<a name="couchdb"></a>
## Example: CouchDB validation

Combining `atleast()` and `atmost()` makes an excellent sieve to sift out good and bad changes.

Use `atleast()` to enforce *required* changes, and `atmost()` to identify every *allowed* change. They work like this:

* `atleast()` runs through every **rule**
  1. If the rule does not match a corresponding change, **fail**
  2. Changes not mentioned by any rules are ignored.
  3. Otherwise, **pass**
* `atmost()` runs through every **change**
  1. If the change does not match any specified rule, **fail**
  2. Rules not matching any changes are ignored.
  3. Otherwise, **pass**

Thus, they can be combined into a powerful, *declarative* validation function.

## Options

obj_diff is a [defaultable][def] API. You can pass an options object to `obj_diff()`, or set it permanently with `.defaults()`.

* **assert**: If true, `atleast()` and `atmost()` will throw assertion errors instead of returning `false` for policy failures. Default is `false`
* **revisions**: If true, `atmost()` allows normal changes to `._revisions` made by CouchDB. Default is `true`.

Examples of setting options:

```javascript
var obj_diff = require("obj_diff");
var sct_diff = obj_diff.defaults({"revisions":false}); // Strict
var asr_diff = obj_diff.defaults({"assert":true});     // Asserts

var diff;

// These are the same.
diff = obj_diff(oldObj, newObj, {revisions:false});
diff = sct_diff(oldObj, newObj);

// These are the same.
try {
  diff = obj_diff(oldObj, newObj, {assert:true});
  diff.atmost({}); // No changes allowed.

  diff = asr_diff(oldObj, newObj);
  diff.atmost({}); // No changes allowed.
}
catch (failed) {
  console.error("You may not change this object");
}
```

## Direct API

You can use the diff object yourself. Here's what it looks like:

    > obj_diff({x:"hi"}, {x:"bye"})
    { x: { from: 'hi', to: 'bye' } }

    > obj_diff({name:"Joe", word:"hi"},
    ...        {name:"Joe", word:"bye"})
    { word: { from: 'hi', to: 'bye' } }

    > obj_diff({name:"Joe", contact: {email:"doe@example.com"}},
    ...        {name:"Joe", contact: {email:"doe@example.com", cell:"555-1212"}})
    { contact: { cell: { from: ['undefined'], to: '555-1212' } } }

    (Note, that is ['undefined'], not Javascript undefined because a round-trip
    through JSON would change it to null, and that is a totally different diff.)

    > obj_diff({name:"Joe", contact: {email:"doe@example.com", cell:null      }},
    ...        {name:"Joe", contact: {email:"doe@example.com", cell:"555-1212"}})
    { contact: { cell: { from: null, to: '555-1212' } } }

[def]: https://github.com/iriscouch/defaultable
