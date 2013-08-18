(function() {
  var database, db, feedparser, getData, http, insert_couchdb_doc, logging, nano, request, winston;

  http = require('http');

  nano = require('nano')('http://localhost:5984');

  feedparser = require('feedparser');

  request = require('request');

  winston = require('winston');

  logging = {
    'location': 'log/error.log'
  };

  database = {
    'name': 'global'
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
    db = nano.use(database_name);
    return db.insert(doc, function(error, http_body, http_headers) {
      if (error) {
        if (error.message === "no_db_file" && tried < 1) {
          return nano.db.create(database_name, function() {
            return insert_couchdb_doc(database_name, doc, tried + 1);
          });
        } else {
          return winston.log('error', error);
        }
      }
    });
  };

  getData = function(callback) {
    db = nano.use(database.name);
    return db.get("rss-feeds", function(err, res) {
      var element, handleElement, key, result, value, _i, _len;
      if (err) {
        return console.error(err);
      } else {
        result = [];
        for (key in res) {
          value = res[key];
          if (key !== '_id' && key !== '_rev' && key !== '' && key !== '_revs_info') {
            handleElement = function(element) {
              var item;
              item = {
                db: key,
                feed: element.feed
              };
              return result.push(item);
            };
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              element = value[_i];
              handleElement(element);
            }
          }
        }
        return callback(null, result);
      }
    });
  };

  getData(function(err, res) {
    var checkKeyword, main, value, _i, _len, _results;
    checkKeyword = function(keyword, string) {
      if ((string != null) && (keyword != null)) {
        if (string.toLowerCase().indexOf(keyword.toLowerCase()) !== -1) {
          return true;
        } else {
          return false;
        }
      } else {
        winston.log('error', 'String was null');
        return false;
      }
    };
    main = function(value) {
      return request(value.feed).pipe(new feedparser()).on('error', function(error) {
        return winston.log('error', error);
      }).on('meta', function(meta) {}).on('readable', function() {
        var item, stream, _results;
        stream = this;
        _results = [];
        while ((item = stream.read())) {
          if (checkKeyword('bitcoin', item.title) || checkKeyword('bitcoin', item.description)) {
            item._id = item.title;
            _results.push(insert_couchdb_doc(value.db, item, 0));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
    };
    _results = [];
    for (_i = 0, _len = res.length; _i < _len; _i++) {
      value = res[_i];
      _results.push(main(value));
    }
    return _results;
  });

}).call(this);
