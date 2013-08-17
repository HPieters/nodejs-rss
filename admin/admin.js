(function() {
  var addRecord, app, couch, dbs, express, feeds, hbs, nodeCouchDB, path, revision, updateGlobal;

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

  revision = '';

  feeds = [];

  dbs = [];

  couch.get("global", "rss-feeds", function(err, res) {
    var data, element, key, processElement, value, _ref, _results;
    if (err) {
      return console.error(err);
    } else {
      data = res.data;
      revision = res.data._rev;
      _ref = res.data;
      _results = [];
      for (key in _ref) {
        value = _ref[key];
        if (key !== '_id' && key !== '_rev' && key !== '' && key !== '_revs_info') {
          dbs.push(key);
          processElement = function(element) {
            element.db = key;
            return feeds.push(element);
          };
          _results.push((function() {
            var _i, _len, _results1;
            _results1 = [];
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              element = value[_i];
              _results1.push(processElement(element));
            }
            return _results1;
          })());
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  });

  updateGlobal = function(doc) {
    var docu, field, value;
    value = {
      'name': doc.name,
      'feed': doc.feed
    };
    field = doc.db;
    docu = {
      "_id": "rss-feeds",
      "_rev": revision
    };
    docu[doc.db] = value;
    return couch.update("global", docu, function(err, resData) {
      if (err) {
        console.error(err);
      }
      return console.log(resData);
    });
  };

  addRecord = function(data) {
    var value;
    value = {
      'db': data.param('rss_db'),
      'name': data.param('rss_name'),
      'feed': data.param('rss_feed')
    };
    return updateGlobal(value);
  };

  app.get("/", function(req, res) {
    return res.render('index', {
      'menuOverview': true
    });
  });

  app.get("/settings", function(req, res) {
    return res.render('settings-index', {
      'feeds': feeds,
      'menuSettings': true
    });
  });

  app.get("/settings/rss/add", function(req, res) {
    return res.render('settings/rss/add', {
      'menuSettings': true,
      'dbs': dbs
    });
  });

  app.post("/settings/rss/add", function(req, res) {
    return addRecord(req);
  });

  app.listen(3000);

}).call(this);
