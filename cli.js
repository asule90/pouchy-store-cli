const vorpal = require('vorpal')();

vorpal
  .command('say [words...]')
  .option('-b, --backwards')
  .option('-t, --twice')
  .action(function (args, callback) {
    let str = args.words.join(' ');
    str = (args.options.backwards) ?
      str.split('').reverse().join('') :
      str+' '+str;
    this.log(str);
    callback();
  }); 

vorpal
    .delimiter('pouchy-store-cli$')
    .show();
