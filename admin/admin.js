(function() {
  var app, couch, createRecord, deleteRecord, express, hbs, nodeCouchDB, path, spliceFunc, updateFeeds, updateGlobal,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  express = require('express');

  hbs = require('express3-handlebars');

  path = require('path');

  nodeCouchDB = require('node-couchdb');

  couch = new nodeCouchDB("localhost", 5984);

  app = express();

  hbs = hbs.create({
    defaultLayout: 'main',
    helpers: {
      rawArray: function(input) {
        var addElement, commaHelper, element, string, _i, _len;
        commaHelper = input.length;
        string = '[';
        addElement = function(element) {
          string += "'" + element + "'";
          commaHelper--;
          if (commaHelper !== 0) {
            return string += ",";
          }
        };
        for (_i = 0, _len = input.length; _i < _len; _i++) {
          element = input[_i];
          addElement(element);
        }
        string += ']';
        return string;
      }
    }
  });

  app.configure(function() {
    app.set('views', __dirname + '/views');
    app.engine('handlebars', hbs.engine);
    app.set('view engine', 'handlebars');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    return app.use(express["static"](path.join(__dirname, 'public')));
  });

  updateFeeds = function(callback) {
    var dbs, result;
    result = [];
    dbs = [];
    return couch.get("global", "rss-feeds", function(err, res) {
      var element, key, processElement, value, _i, _len, _ref;
      if (err) {
        return console.error(err);
      } else {
        _ref = res.data;
        for (key in _ref) {
          value = _ref[key];
          if (key !== '_id' && key !== '_rev' && key !== '' && key !== '_revs_info') {
            if (__indexOf.call(dbs, key) >= 0 !== (processElement = function(element) {
              if (element != null) {
                element.db = key;
                return result.push(element);
              }
            })) {
              dbs.push(key);
            }
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              element = value[_i];
              processElement(element);
            }
          }
        }
        return callback(null, res.data, result, dbs);
      }
    });
  };

  updateGlobal = function(doc, callback) {
    var value;
    value = {
      '_id': 0,
      'name': doc.name,
      'feed': doc.feed
    };
    return updateFeeds(function(err, res) {
      var data, id, original;
      data = res;
      if (data.hasOwnProperty(doc.db)) {
        original = data[doc.db];
        id = original[original.length - 1]['_id'] + 1;
        value._id = id;
        original.push(value);
      } else {
        data[doc.db] = [];
        data[doc.db].push(value);
      }
      return couch.update("global", data, function(err, resData) {
        if (err) {
          console.error(err);
        }
        return callback(null, true);
      });
    });
  };

  spliceFunc = function(my_array, element_to_remove) {
    var key, value;
    for (key in my_array) {
      value = my_array[key];
      if (parseInt(value._id) === parseInt(element_to_remove)) {
        my_array.splice(key, 1);
      }
    }
    return my_array;
  };

  createRecord = function(data, callback) {
    var value;
    value = {
      'db': data.param('rss_db'),
      'name': data.param('rss_name'),
      'feed': data.param('rss_feed')
    };
    return updateGlobal(value, callback);
  };

  deleteRecord = function(database, id, callback) {
    return updateFeeds(function(err, res) {
      var new_array;
      if (res.hasOwnProperty(database)) {
        new_array = spliceFunc(res[database], id);
        if (new_array[0] != null) {
          res[database] = new_array;
        } else {
          delete res[database];
        }
        return couch.update("global", res, function(err, resData) {
          if (err) {
            console.error(err);
          }
          return callback(null, true);
        });
      } else {
        return callback(true);
      }
    });
  };

  app.get("/", function(req, res) {
    return res.render('index', {
      'menuOverview': true
    });
  });

  app.get("/settings", function(req, res) {
    return updateFeeds(function(err, raw, rFeeds, rDbs) {
      return res.render('settings-index', {
        'feeds': rFeeds,
        'menuSettings': true
      });
    });
  });

  app.get("/settings/rss/create", function(req, res) {
    return updateFeeds(function(err, raw, rFeeds, rDbs) {
      return res.render('settings/rss/add', {
        'menuSettings': true,
        'dbs': rDbs
      });
    });
  });

  app.get("/settings/rss/delete/:database/:id", function(req, res) {
    var database, id;
    database = req.params.database;
    id = req.params.id;
    return deleteRecord(database, id, function(err, cRes) {
      return res.redirect('/settings');
    });
  });

  app.post("/settings/rss/create", function(req, res) {
    return createRecord(req, function(err, cRes) {
      return res.redirect('/settings/rss/create');
    });
  });

  app.listen(3000);

}).call(this);
