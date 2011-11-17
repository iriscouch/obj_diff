// Add console.log and console.error global variables. This is bad.
//

if(typeof console === 'undefined')
  console = {};

console.dir   = console.dir   || dir;

console.log   = console.log   || logger;
console.error = console.error || logger;

function logger(fmt) {
  var args = Array.prototype.slice.apply(arguments, [1]);
  fmt = fmt.replace(/%j/g, function(code, pos, str) {
    return JSON.stringify(args.shift());
  })

  return log(fmt);
}

function dir(obj) {
  return log(obj);
}
