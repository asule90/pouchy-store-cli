> CLI App based on [Vorpal](http://vorpal.js.org/) to work with [pouchy-store](https://github.com/eFishery/pouchy-store) (PouchDB)

## Install

```bash
$ npm install
```


## Get Started

```bash
$ npm run start
```

## Usage

```bash
Type `help` to show available commands
Type `logout` to exit
pouchy-store-cli$ help

  Commands:

    help [command...]  Provides help for a given command.
    exit               Exits application.
    login <email>      Login with gmail account
    logout             Logout and exit cli
    list               List All Task, greyed out task is marked as done
    add                Add a new task
    done <number>      Mark a task as done identified by its number
    undone <number>    Mark a task as undone identified by its number
    delete <number>    Delete a task identified by its number
    edit <number>      Edit a task identified by its number
    sync               Sync all task with the cloud
```