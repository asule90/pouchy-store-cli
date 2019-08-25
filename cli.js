const vorpal = require('vorpal')();
import userStore from './store/user.js';
import todosStore from './store/todos.js';
const exitHook = require('async-exit-hook');
var mkdirp = require('mkdirp');
var moment = require('moment');

mkdirp('db', function (err) {
  if (err) {
    vorpal.error(err);
    vorpal.exec("exit");
  }
});

vorpal.log('Type `help` to show available commands');
vorpal.log('Type `logout` to exit');

try {
  userStore.initialize();
} catch (error) {
  vorpal.log(error);
}

async function shutdown() {
  vorpal.log('Exitting');
  try {
    await todosStore.deinitialize();
  } catch (err) {
    vorpal.log(err);
  }
  vorpal.log('Exitted');
}

let loggedIn = userStore.isInitialized || false

let isLoggedIn = (cb) => {
  if (!loggedIn) {
    vorpal.log(vorpal.chalk.red('Please Login or type `help`'));
    cb();
    return false;
  } else {
    return true;
  }
};

let isNumericArg = (args, cb) => {
  if (isNaN(args.number)) {
    vorpal.log(vorpal.chalk.red('Argument is not a number'));
    cb();
    return false;
  } else {
    return true;
  }
};
let isTaskIndexExist = (index, cb) => {
  if (Array.isArray(todosStore.data) && (index in todosStore.data)) {
    return true;
  } else {
    vorpal.log(vorpal.chalk.red('Task is not recognized'));
    cb();
    return false;
  }
};

// LOGIN
vorpal
.history('main-history')
.command('login <email>')
.description('Login with gmail account')
.action(async function (args, callback) {
  const _this = this;
  let email = args.email;

  if (!email.endsWith('@gmail.com')) {
    _this.log('please use @gmail.com');
  } else {
    _this.log("logging in");

    let id = email;
    id = id.split('@').shift().replace(/\W/g, '');

    await userStore.editSingle({
      id,
      email: email,
    });

    setTimeout(async () => {
      loggedIn = true;
      _this.log("logged in as " + email);
      _this.log("user_id : " + userStore.data.id);
  
      if (!todosStore.isInitialized) {
        _this.log('popup initialize all offline data...');
        await todosStore.setName(userStore.data.id);
        await todosStore.initialize();
        _this.log('popup done');
        // _this.log("store_name : " + todosStore.name);
        callback();
      } else {
        callback();
      }

    }, 500)
  }

});

// LOGOUT
vorpal
.history('main-history')
.command('logout')
.description('Logout and exit cli')
.action(async function () {
  vorpal.log('Logging out');
  loggedIn = false;
  await userStore.deleteSingle();
  vorpal.exec("exit");
});

// LIST
vorpal
.history('main-history')
.command('list')
.description('List All Task, greyed out task is marked as done')
.action(async function (args, callback) {
  const _this = this;

  if (isLoggedIn(callback)) {
    todosStore.data.forEach((todo, index) => {
      process.stdout.write((parseInt(index)+1)+'. ')
      if (todo.done) {
        process.stdout.write(vorpal.chalk.grey(todo.text));
      } else {
        process.stdout.write(vorpal.chalk.green.bold(todo.text));
      }
      _this.log(', '+(todo.tags.map((v) => ('#'+v)))+vorpal.chalk.grey(' ('+moment(todo.createdAt).format('D/MMM/YYYY, H:mm:ss')+')'));
    });
  }
  callback();
});

// ADD NEW TASK
vorpal
.history('main-history')
.command('add')
.description('Add a new task')
.action(function (args, callback) {
  if (isLoggedIn(callback)) {
    const _this = this;
    // const index = parseInt(args.number) - 1;
    // const task = todosStore.data[index];
    let task_text = '';
    let tags = '';
  
    _this.prompt({
      type: 'input',
      name: 'task_text',
      message: 'New Task : '
    }).then((result) => {
      task_text = result.task_text;
      if (!task_text) {
        _this.log(vorpal.chalk.red('Task is required'));
        callback();
      } else {
        _this.prompt({
          type: 'input',
          name: 'tags_text',
          message: 'Tags (comma delimited) : '
        }).then(async (result) => {
          tags = result.tags_text;
    
          if (!tags) {
            _this.log(vorpal.chalk.red('Tags is required'));
            callback();
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
              callback();
            } catch (error) {
              _this.log(vorpal.chalk.red('Problem adding new task'));
              _this.log(err);
              callback();
            }
          }
        })
      }
    })
  }
});

// MARK TASK AS DONE
vorpal
.history('main-history')
.command('done <number>')
.description('Mark a task as done identified by its number')
.action(async function (args, callback) {
  if (isLoggedIn(callback)) {
    if (isNumericArg(args, callback)) {
      const index = parseInt(args.number) - 1;
      if (isTaskIndexExist(index, callback)) {
        const task = todosStore.data[index];
        
        await todosStore.editItem(task._id, {
          text: task.text,
          tags: task.tags,
          done: true
        }, userStore.data)
        vorpal.log(vorpal.chalk.green('Marked task #'+args.number+' as done'));
  
        callback();
      }
    }
  }
});

// MARK TASK AS UNDONE
vorpal
.history('main-history')
.command('undone <number>')
.description('Mark a task as undone identified by its number')
.action(async function (args, callback) {
  if (isLoggedIn(callback)) {
    if (isNumericArg(args, callback)) {
      const index = parseInt(args.number) - 1;
      if (isTaskIndexExist(index, callback)) {
        const task = todosStore.data[index];
        
        await todosStore.editItem(task._id, {
          text: task.text,
          tags: task.tags,
          done: false
        }, userStore.data)
        vorpal.log(vorpal.chalk.green('Marked task #'+args.number+' as undone'));

        callback();
      }
    }
  }
});

// DELETE A TASK
vorpal
.history('main-history')
.command('delete <number>')
.description('Delete a task identified by its number')
.action(function (args, callback) {
  if (isLoggedIn(callback)) {
    if (isNumericArg(args, callback)) {
      const index = parseInt(args.number) - 1;
      if (isTaskIndexExist(index, callback)) {
        const task = todosStore.data[index];
        
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
              vorpal.log(vorpal.chalk.green('Deleted task #'+args.number+''));
              callback();
            } else {
              callback();
            }
          })    
        } catch (error) {
          vorpal.log(error);
          callback();
        }
      }
    }
  }

});

// EDIT A TASK
vorpal
.history('main-history')
.command('edit <number>')
.description('Edit a task identified by its number')
.action(function (args, callback) {
  if (isLoggedIn(callback)) {
    if (isNumericArg(args, callback)) {
      const _this = this;
      const index = parseInt(args.number) - 1;
      if (isTaskIndexExist(index, callback)) {
        const task = todosStore.data[index];
        let task_text = '';
        let tags = '';
      
        _this.prompt({
          type: 'input',
          name: 'task_text',
          message: 'Edit Task '+args.number+' to : '
        }).then((result) => {
          task_text = result.task_text;
          if (!task_text) {
            _this.log(vorpal.chalk.red('Task is required'));
            callback();
          } else {
            _this.prompt({
              type: 'input',
              name: 'tags_text',
              message: 'Tags (comma delimited) : '
            }).then(async (result) => {
              tags = result.tags_text;
        
              if (!tags) {
                _this.log(vorpal.chalk.red('Tags is required'));
                callback();
              } else {
                tags = tags.split(',').map((v) => {
                  return v.trim();
                })
                
                try {
                  await todosStore.editItem(task._id, {
                    text: task_text,
                    tags: tags,
                  }, userStore.data);
                  _this.log(vorpal.chalk.green('Edited the task'));
                  callback();
                } catch (error) {
                  _this.log(vorpal.chalk.red('Problem editting the task'));
                  _this.log(err);
                  callback();
                }
              }
            })
          }
        })
      }
    }
  }

});

// SYNC TASKS
vorpal
.history('main-history')
.command('sync')
.description('Sync all task with the cloud')
.action(function (args, callback) {
  const _this = this;
  if (isLoggedIn(callback)) {
    const index = parseInt(args.number) - 1;
    const task = todosStore.data[index];

    const totalPendingData = todosStore.countUnuploadeds();

    _this.prompt({
      type: 'confirm',
      name: 'toBeSynced',
      message: totalPendingData+' local pending data, sync now?',
      default: false
    }).then(async (result) => {
      if (result.toBeSynced) {
        _this.log('syncing...');
        await todosStore.upload().then(() => {
          _this.log(vorpal.chalk.green('Synced all tasks'));
        }).catch(err => {
          _this.log(vorpal.chalk.red('Sync failed'));
          _this.log(err.message);
        })
      } else {
        _this.log('cancel');
      }
      callback();
    })
  }
});

vorpal.on('vorpal_exit', function onSigterm () {
  // start graceful shutdown here
  shutdown();
})

vorpal
.delimiter('pouchy-store-cli$')
.show();
