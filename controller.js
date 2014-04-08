
function makeCommand(type, args) {
  var names = commands[type].args
    , data = {}
  for (var i=0; i<names.length; i++) {
    data[names[i]] = args[i]
  }
  return {type: type, data: data}
}

function Controller(root, ids) {
  this.model = new Model(root, ids, null)
  this.view = new View(this.bindActions.bind(this),
                       this.model.idAbove.bind(this.model),
                       this.model.idBelow.bind(this.model),
                       this.undo.bind(this),
                       this.redo.bind(this))
  this.node = this.view.initialize(root, ids)
  this.commands = []
  this.histpos = 0
  this.working = false
  // connect the two.
}

Controller.prototype = {
  /**
   * You can pass in any number of type, args pairs.
   * Ex: executeCommands(t1, a1, t2, a2, ...)
   */
  executeCommands: function (type, args) {
    if (this.working) return
    var cmds = [];
    for (var i=0; i<arguments.length; i+=2) {
      cmds.push(makeCommand(arguments[i], arguments[i+1]))
    }
    if (this.histpos > 0) {
      this.commands = this.commands.slice(0, -this.histpos)
      this.histpos = 0
    }
    this.commands.push(cmds)
    console.log('Executing', this.histpos, this.commands.length)
    for (var i=0;i<this.commands.length;i++){console.log(' >',this.commands[i][0].type, this.commands[i].length)}
    for (var i=0; i<cmds.length; i++) {
      this.doCommand(cmds[i])
    }
  },
  undo: function () {
    var pos = this.histpos ? this.histpos + 1 : 1
      , ix = this.commands.length - pos
    if (ix < 0) {
      return false // no more undo!
    }
    var cmds = this.commands[ix]
    for (var i=0;i<this.commands.length;i++){console.log(this.commands[i][0].type, this.commands[i].length)}
    for (var i=cmds.length-1; i>=0; i--) {
      this.undoCommand(cmds[i])
    }
    this.histpos += 1
    return true
  },
  redo: function () {
    var pos = this.histpos ? this.histpos - 1 : -1
      , ix = this.commands.length - 1 - pos
    if (ix >= this.commands.length) {
      return false // no more to redo!
    }
    var cmds = this.commands[ix]
    for (var i=0;i<this.commands.length;i++){console.log(this.commands[i][0].type, this.commands[i].length)}
    for (var i=0; i<cmds.length; i++) {
      this.redoCommand(cmds[i])
    }
    this.histpos -= 1
    return true
  },
  doCommand: function (cmd) {
    console.log('do command', cmd.type, cmd.data);
    commands[cmd.type].apply.call(cmd.data, this.view, this.model)
  },
  undoCommand: function (cmd) {
    console.log('undo command', cmd.type, cmd.data);
    this.working = true
    commands[cmd.type].undo.call(cmd.data, this.view, this.model)
    this.working = false
  },
  redoCommand: function (cmd) {
    console.log('redo command', cmd.type, cmd.data);
    var c = commands[cmd.type]
    ;(c.redo || c.apply).call(cmd.data, this.view, this.model)
  },

  bindActions: function (id) {
    var actions = {}
      , val
    for (var action in this.actions) {
      val = this.actions[action]
      if ('string' === typeof val) {
        val = this[val][action].bind(this[val], id)
      } else {
        val = val.bind(this, id)
      }
      actions[action] = val
    }
    return actions
  },

  actions: {
    undo: function () {this.undo()},
    redo: function () {this.redo()},
    changed: function (id, attr, value) {
      var data = {}
      data[attr] = value
      this.executeCommands('changeNode', [id, data])
    },
    goUp: function (id) {
      // should I check to see if it's ok?
      var above = this.model.idAbove(id, this.view.collapsed)
      if (above === false) return
      this.view.startEditing(above);
    },
    goDown: function (id, fromStart) {
      var below = this.model.idBelow(id, this.view.collapsed)
      if (below === false) return
      this.view.startEditing(below, fromStart);
    },
    toggleCollapse: function (id, yes) {
      if (arguments.length === 1) {
        yes = !this.view.collapsed[id]
      }
      if (!yes) {
        return this.view.toggleCollapse(id, yes)
      }
      var tocollapse = this.model.findCollapser(id, this.view.collapsed)
      this.view.toggleCollapse(tocollapse, yes)
    },
    addAfter: function (id, text) {
      var nw = this.model.idNew(id, this.view.collapsed)
      this.executeCommands('newNode', [nw.pid, nw.index, text])
    },
    remove: function (id, addText) {
      var before = this.model.idAbove(id, this.view.collapsed)
      this.executeCommands(
        'remove', [id],
        'appendText', [before, addText]
      )
    },
    setEditing: 'view',
    doneEditing: 'view'
  },
}

