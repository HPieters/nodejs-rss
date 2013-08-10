(function() {
  var app, db, express, feeds, hbs, nano, path, revision, update_global;

  express = require('express');

  hbs = require('express3-handlebars');

  path = require('path');

  nano = require('nano')('http://192.168.1.15:5984');

  app = express();

  app.configure(function() {
    app.set('views', __dirname + '/views');
    app.engine('handlebars', hbs({
      defaultLayout: 'main'
    }));
    app.set('view engine', 'handlebars');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    return app.use(express["static"](path.join(__dirname, 'public')));
  });

  db = nano.use('global');

  revision = {
    'rss-feeds': ''
  };

  feeds = '';

  db.get('rss-feeds', {
    revs_info: true
  }, function(err, body) {
    if (err) {
      return console.log(err);
    } else {
      revision['rss-feeds'] = body._rev;
      return feeds = body.feeds;
    }
  });

  update_global = function(doc) {
    return db.insert({
      '_rev': revision[doc],
      content: content
    }, doc, function(err, body) {
      if (err) {
        return console.log(err);
      } else {
        return console.log(body);
      }
    });
  };

  app.get("/", function(req, res) {
    return res.render('index', {
      'feeds': feeds,
      'title': 'test'
    });
  });

  app.listen(3000);

}).call(this);
