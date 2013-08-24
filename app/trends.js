(function() {
  var db, feedparser, getData, getDateTime, http, insert_couchdb_doc, nano, request, runtime, settings, winston;

  http = require('http');

  nano = require('nano')('http://localhost:5984');

  feedparser = require('feedparser');

  request = require('request');

  winston = require('winston');

  settings = {
    'log_err_location': 'log/error.log',
    'log_info_location': 'log/info.log',
    'rss_feeds': 'global',
    'keyword': 'bitcoin',
    'limit': 10
  };

  runtime = {
    'running': 0,
    'added': 0
  };

  db = nano.use(settings.rss_feeds);

  winston.add(winston.transports.File, {
    filename: settings.log_err_location
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
          if (error.status_code !== 409) {
            return winston.log('error', error);
          }
        }
      } else {
        return runtime.added += 1;
      }
    });
  };

  /**
   * Get data from the database
   * @param  {callback}   function
  */


  getData = function(callback) {
    db = nano.use(settings.rss_feeds);
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

  getDateTime = function() {
    var date, day, hour, min, month, sec, year;
    date = new Date();
    hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    year = date.getFullYear();
    month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    day = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
  };

  winston.info("Start: " + (getDateTime()));

  getData(function(err, res) {
    var checkKeyword, done, feedReader, main;
    checkKeyword = function(keyword, string) {
      if ((string != null) && (keyword != null)) {
        if (string.toLowerCase().indexOf(keyword.toLowerCase()) !== -1) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    };
    main = function(value, callback) {
      return request(value.feed).pipe(new feedparser()).on('error', function(error) {
        return winston.log('error', error);
      }).on('meta', function(meta) {}).on('readable', function() {
        var item, stream, _results;
        stream = this;
        _results = [];
        while ((item = stream.read())) {
          if (checkKeyword(settings.keyword, item.title) || checkKeyword(settings.keyword, item.description)) {
            item._id = item.title;
            _results.push(insert_couchdb_doc(value.db, item, 0));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }).on('end', function() {
        return callback();
      });
    };
    done = function() {
      return winston.info("Done: " + (getDateTime()) + " - Added " + runtime.added);
    };
    feedReader = function() {
      var feed;
      while (runtime.running < settings.limit && res.length > 0) {
        feed = res.shift();
        main(feed, function() {
          runtime.running--;
          if (res.length > 0) {
            return feedReader();
          }
        });
        runtime.running++;
      }
      if (res.length === 0) {
        return done();
      }
    };
    return feedReader();
  });

}).call(this);
