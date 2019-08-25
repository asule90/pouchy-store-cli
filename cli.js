const vorpal = require('vorpal')();
import userStore from './store/user.js';
import todosStore from './store/todos.js';
const exitHook = require('async-exit-hook');
var mkdirp = require('mkdirp');
var moment = require('moment');
    
mkdirp('db', function (err) {
  if (err) {
    console.error(err)
    vorpal.exec("exit");
  }
});

console.log('Type `help` to show available command')
console.log('Type `logout` to exit')

try {
  userStore.initialize();
} catch (error) {
  console.log(error)
}
let unsubUser;
let unsubTodos;
let stateUpdate;
const saveState = function(){
  stateUpdate = new Date()
}

/* componentWillUnmount() {
  this.unsubUser();
} */

const isLoggedIn = () => (!!userStore.data.email)

vorpal
.history('main-history')
.command('login <email>')
.description('Login with gmail account')
.action(async function (args, callback) {
  const _this = this
  let email = args.email;

  if (!email.endsWith('@gmail.com')) {
    _this.log('please use @gmail.com');
  } else {
    _this.log("logging in");

    let id = email;
    id = id.split('@').shift().replace(/\W/g, '');

    // unsubUser = userStore.subscribe(saveState);
    // _this.log(userStore.subscribers)

    await userStore.editSingle({
      id,
      email: email,
    });

    setTimeout(async () => {
      _this.log("logged in as " + email);
      _this.log("user_id : " + userStore.data.id);
  
      if (!todosStore.isInitialized) {
        _this.log('popup initialize all offline data...');
        todosStore.setName(userStore.data.id);
        _this.log("store_name : " + todosStore.name);
        await todosStore.initialize()
        _this.log('popup done');
        // _this.log("store_name : " + todosStore.name);
      }
    }, 500)
  }

  callback();
});

vorpal
.history('main-history')
.command('list')
.description('List All Task, greyed out task is marked as done')
.action(async function (args, callback) {
  const _this = this

  if (isLoggedIn()) {
    // unsubTodos = todosStore.subscribe(saveState);
    todosStore.data.forEach((todo, index) => {
      process.stdout.write((parseInt(index)+1)+'. ')
      if (todo.done) {
        process.stdout.write(vorpal.chalk.grey(todo.text))
      } else {
        process.stdout.write(vorpal.chalk.green.bold(todo.text))
      }
      _this.log(', '+(todo.tags.map((v) => ('#'+v)))+vorpal.chalk.grey(' ('+moment(todo.createdAt).format('D/MMM/YYYY, H:mm:ss')+')'))
    });

  } else {
    _this.log(vorpal.chalk.red('Please Login or type `help`'))
  }

  callback();
});

vorpal
.history('main-history')
.command('logout')
.description('Logout and exit cli')
.action(async function () {
  await shutdown()
  vorpal.exec("exit");
});

vorpal
.history('main-history')
.command('add')
.description('Add a task')
.action(function (args, callback) {
  const _this = this
  // const index = parseInt(args.number) - 1
  // const task = todosStore.data[index]
  let task_text = ''
  let tags = ''

  _this.prompt({
    type: 'input',
    name: 'task_text',
    message: 'New Task :'
  }).then((result) => {
    task_text = result.task_text
    if (!task_text) {
      _this.log(vorpal.chalk.red('Task is required'));
      callback()
    } else {
      _this.prompt({
        type: 'input',
        name: 'tags_text',
        message: 'Tags (comma delimited) :'
      }).then(async (result) => {
        tags = result.tags_text
  
        if (!tags) {
          _this.log(vorpal.chalk.red('Tags is required'));
          callback()
        } else {
          tags = tags.split(',').map((v) => {
            return v.trim();
          })
          
          try {
            await todosStore.addItem({
              text: task_text,
              tags: tags,
              done: false
            }, userStore.data)
            _this.log(vorpal.chalk.green('New task has been added'));
            callback()
          } catch (error) {
            _this.log(vorpal.chalk.red('Problem adding new task'));
            _this.log(err);
            callback()
          }
        }
      })
    }
  })
});

vorpal
.history('main-history')
.command('done <number>')
.description('Mark a task as done identified by its number')
.action(async function (args, callback) {
  const index = parseInt(args.number) - 1
  const task = todosStore.data[index]
  
  await todosStore.editItem(task._id, {
    text: task.text,
    tags: task.tags,
    done: true
  }, userStore.data)
  vorpal.log(vorpal.chalk.green('Marked task #'+args.number+' as done'))

  callback()
});

vorpal
.history('main-history')
.command('undone <number>')
.description('Mark a task as undone identified by its number')
.action(async function (args, callback) {
  const index = parseInt(args.number) - 1
  const task = todosStore.data[index]
  
  await todosStore.editItem(task._id, {
    text: task.text,
    tags: task.tags,
    done: false
  }, userStore.data)
  vorpal.log(vorpal.chalk.green('Marked task #'+args.number+' as undone'))

  callback()
});

vorpal
.history('main-history')
.command('delete <number>')
.description('Delete a task identified by its number')
.action(function (args, callback) {
  const index = parseInt(args.number) - 1
  const task = todosStore.data[index]
  
  try {
    this.prompt({
      type: 'confirm',
      name: 'toBeDeleted',
      message: 'You are going to delete task #'+args.number+', are you sure?',
      default: false
    }).then(async (result) => {
      // vorpal.log(result.toBeDeleted)
      // vorpal.log(task._id)
      // vorpal.log(userStore.data)
      
      if (result.toBeDeleted) {
        await todosStore.deleteItem(task._id, userStore.data);
        vorpal.log(vorpal.chalk.green('Deleted task #'+args.number+''))
        callback()
      } else {
        callback()
      }
    })    
  } catch (error) {
    vorpal.log(error)
  }

});


/* process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
}); */

async function shutdown() {
  console.log('Logging out');
  try {
    await userStore.deleteSingle();
    await todosStore.deinitialize();
  } catch (err) {
    console.log(err);
  }
  console.log('Logged out');
}

vorpal.on('vorpal_exit', function onSigterm () {
  // start graceful shutdown here
  shutdown()
})


vorpal
.delimiter('pouchy-store-cli$')
.show();
