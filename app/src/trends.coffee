
# Libraries
http        = require 'http'
nano        = require('nano')('http://localhost:5984')
feedparser  = require 'feedparser'
request     = require 'request'
winston     = require 'winston'

# Settings
settings    =
    'log_err_location'  :   'log/error.log' # Location of the error file
    'log_info_location' :   'log/info.log'  # Location of the info file
    'rss_feeds'         :   'global'        # Database where rss feeds are stored
    'keyword'           :   'bitcoin'       # Keyword to search on
    'limit'             :   10              # Maximum number of requests running


runtime     =
    'running'           :   0               # Current running requests (operationsal do not change)
    'added'             :   0

# Predefinitions
db      = nano.use settings.rss_feeds
winston.add winston.transports.File,
    filename: settings.log_err_location

# Program functions (move to seprate documentation later)

###*
 * Create a new document record in the couchdb
 * @param  {String}   Name of the database
 * @param  {Object}   Document
 * @param  {Tried}    Number of tries to create database
###
insert_couchdb_doc = (database_name, doc, tried) ->
    db = nano.use database_name
    db.insert doc, (error, http_body, http_headers) ->
        if error
            if error.message is "no_db_file" and tried < 1
                # create database and retry
                return nano.db.create(database_name, ->
                    insert_couchdb_doc(database_name, doc, tried + 1)
                )
            else
                if error.status_code != 409
                    winston.log('error', error);
        else
            runtime.added += 1

###*
 * Get data from the database
 * @param  {callback}   function
###
getData = (callback) ->
    db = nano.use settings.rss_feeds
    db.get("rss-feeds", (err, res) ->
        if err
            console.error err
        else
            result = []
            for key, value of res
                if key isnt '_id' and key isnt '_rev' and key isnt '' and key isnt '_revs_info'
                    handleElement = (element) ->
                        item =
                            db : key
                            feed : element.feed
                        result.push item

                    handleElement element for element in value
            callback(null, result)
    )

getDateTime = ->
  date = new Date()
  hour = date.getHours()
  hour = ((if hour < 10 then "0" else "")) + hour
  min = date.getMinutes()
  min = ((if min < 10 then "0" else "")) + min
  sec = date.getSeconds()
  sec = ((if sec < 10 then "0" else "")) + sec
  year = date.getFullYear()
  month = date.getMonth() + 1
  month = ((if month < 10 then "0" else "")) + month
  day = date.getDate()
  day = ((if day < 10 then "0" else "")) + day
  year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec


# Call main programming loop with callback
winston.info("Start: #{getDateTime()}")
getData( (err, res) ->
    checkKeyword = (keyword, string) ->
        if string? and keyword?
            if string.toLowerCase().indexOf(keyword.toLowerCase()) isnt -1
                true
            else
                false
        else
            false

    main = (value, callback) ->
        request(value.feed)
        .pipe(new feedparser())
        .on('error', (error) ->
             winston.log('error', error);
        )
        .on('meta', (meta) ->
            #console.log meta
        )
        .on('readable', () ->
            stream = this
            while (item = stream.read())
                if checkKeyword(settings.keyword,item.title) or checkKeyword(settings.keyword,item.description)
                    item._id = item.title
                    insert_couchdb_doc(value.db, item, 0)
                    callback()
                else
                    callback()
        )

    done = ->
        winston.info("Done: #{getDateTime()} - Added #{runtime.added}")

    feedReader = ->
        while runtime.running < settings.limit and res.length > 0
            feed = res.shift()
            main feed, ->
                runtime.running--
                feedReader() if res.length > 0

            runtime.running++
        if res.length is 0 or res.lenth < 0
            done()

    feedReader()

)



