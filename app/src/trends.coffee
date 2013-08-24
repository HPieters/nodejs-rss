
# Required librarys

http        = require 'http'
nano        = require('nano')('http://localhost:5984')
feedparser  = require 'feedparser'
request     = require 'request'
winston     = require 'winston'


# Settings

logging     =
    'location'      : 'log/error.log'

database    =
    'name'          : 'global'

keyword     =  'bitcoin' #Insert Keyword here
# Predefinitions

db = nano.use database.name

winston.add winston.transports.File,
    filename: logging.location

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

# Main programming loop



getData = (callback) ->
    db = nano.use database.name
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

getData( (err, res) ->
    checkKeyword = (keyword, string) ->
        if string? and keyword?
            if string.toLowerCase().indexOf(keyword.toLowerCase()) isnt -1
                true
            else
                false
        else
            winston.log('error', 'String was null');
            false

    main = (value) ->
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
                if checkKeyword(keyword,item.title) or checkKeyword(keyword,item.description)
                    item._id = item.title
                    insert_couchdb_doc(value.db, item, 0)
        )

    main value for value in res

)

