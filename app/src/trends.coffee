
# Required librarys

http        = require 'http'
nano        = require('nano')('http://192.168.1.15:5984')
feedparser  = require 'feedparser'
request     = require 'request'
winston     = require 'winston'


# Settings

logging     =
    'location'      : 'log/error.log'

database    =
    'admin'          : 'global'

feeds       =
    'wired-index'   :
        'feed'      : 'http://feeds.wired.com/wired/index'
        'db'        : 'wired-us'
    'wired-review'  :
        'feed'      : 'http://feeds.wired.com/WiredReviews'
        'db'        : 'wired-us'
    'wired-review'  :
        'feed'      : 'http://feeds.wired.com/WiredReviews'
        'db'        : 'wired-us'
    'wired-video'   :
        'feed'      : 'http://feeds.cnevids.com/mrss/wired.xml'
        'db'        : 'wired-us'
    'wired-howto'   :
        'feed'      : 'http://feeds.wired.com/howtowiki'
        'db'        : 'wired-us'


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
    db = nano use database_name
    db.insert doc, (error, http_body, http_headers) ->
        if error
            if error.message is "no_db_file" and tried < 1
                # create database and retry
                return nano.db.create(database.name, ->
                    insert_couchdb_doc doc, tried + 1
                )
            else
                winston.log('error', error);

# Main programming loop

for key, value of feeds
    request(value.feed)
    .pipe(new feedparser())
    .on('error', (error) ->
         winston.log('error', error);
    )
    .on('meta', (meta) ->
        console.log meta
    )
    .on('readable', () ->
        stream = this
        while (item = stream.read())
            console.log item
            insert_object =
                'title'         : item.title
                'description'   : item.description
            insert_couchdb_doc(value.db, insert_object, 0)
    )


