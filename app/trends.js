(function() {
  var database, db, feedparser, feeds, http, insert_couchdb_doc, key, logging, nano, request, value, winston;

  http = require('http');

  nano = require('nano')('http://192.168.1.15:5984');

  feedparser = require('feedparser');

  request = require('request');

  winston = require('winston');

  logging = {
    'location': 'log/error.log'
  };

  database = {
    'admin': 'global'
  };

  feeds = {
    'wired-index': {
      'feed': 'http://feeds.wired.com/wired/index',
      'db': 'wired-us'
    },
    'wired-review': {
      'feed': 'http://feeds.wired.com/WiredReviews',
      'db': 'wired-us'
    },
    'wired-review': {
      'feed': 'http://feeds.wired.com/WiredReviews',
      'db': 'wired-us'
    },
    'wired-video': {
      'feed': 'http://feeds.cnevids.com/mrss/wired.xml',
      'db': 'wired-us'
    },
    'wired-howto': {
      'feed': 'http://feeds.wired.com/howtowiki',
      'db': 'wired-us'
    }
  };

  db = nano.use(database.name);

  winston.add(winston.transports.File, {
    filename: logging.location
  });

  /**
   * Create a new document record in the couchdb
   * @param  {String}   Name of the database
   * @param  {Object}   Document
   * @param  {Tried}    Number of tries to create database
  */


  insert_couchdb_doc = function(database_name, doc, tried) {
    db = nano(use(database_name));
    return db.insert(doc, function(error, http_body, http_headers) {
      if (error) {
        if (error.message === "no_db_file" && tried < 1) {
          return nano.db.create(database.name, function() {
            return insert_couchdb_doc(doc, tried + 1);
          });
        } else {
          return winston.log('error', error);
        }
      }
    });
  };

  for (key in feeds) {
    value = feeds[key];
    request(value.feed).pipe(new feedparser()).on('error', function(error) {
      return winston.log('error', error);
    }).on('meta', function(meta) {
      return console.log(meta);
    }).on('readable', function() {
      var insert_object, item, stream, _results;
      stream = this;
      _results = [];
      while ((item = stream.read())) {
        console.log(item);
        insert_object = {
          'title': item.title,
          'description': item.description
        };
        _results.push(insert_couchdb_doc(value.db, insert_object, 0));
      }
      return _results;
    });
  }

}).call(this);
