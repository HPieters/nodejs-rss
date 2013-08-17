# Libaries

express         = require 'express'
hbs             = require 'express3-handlebars'
path            = require 'path'
nodeCouchDB     = require 'node-couchdb'
couch           = new nodeCouchDB("localhost", 5984);

#nano    = require('nano')('http://localhost:5984')

# Predefinitions

app = express()

hbs = hbs.create(
    defaultLayout: 'main'
    helpers:
        rawArray: (input) ->
            commaHelper = input.length
            string = '['

            addElement = (element) ->
                 string += "'#{element}'"
                 commaHelper--
                 if commaHelper isnt 0
                    string += ","

            addElement element for element in input
            string += ']'
            return string
)

app.configure( () ->
    app.set('views', __dirname + '/views')
    app.engine('handlebars', hbs.engine)
    app.set('view engine', 'handlebars')
    app.use(express.favicon())
    app.use(express.logger('dev'))
    app.use(express.bodyParser())
    app.use(express.methodOverride())
    app.use(app.router)
    app.use(express.static(path.join(__dirname, 'public')))
)

# Global variables

revision    = ''
feeds       = []
dbs         = []

#wired_us  = [
#    {
#        '_id'   : 0
#        'name'  : 'Wired Top Stories'
#        'feed'  : 'http://feeds.wired.com/wired/index'
#    }
#]



# Main program

# Get the RSS feeds in Global

couch.get("global", "rss-feeds", (err, res) ->
    if err
        console.error err
    else
        data = res.data
        revision = res.data._rev

        for key, value of res.data
            if key != '_id' and key isnt '_rev' and key isnt '' and key isnt '_revs_info'
                # Push database into the database array
                dbs.push key
#
                processElement = (element) ->
                    element.db = key
                    feeds.push element
#
                processElement element for element in value
)


#db.get('rss-feeds', { revs_info: true }, (err, body) ->
#    if err
#        console.log err
#    else
#

        #db.insert({'_rev' : revision['rss-feeds'], wired_us}, 'rss-feeds', (err,body) ->
        #    if err
        #        console.log err
        #    else
        #        console.log body
        #)
#)

updateGlobal = (doc) ->
    value =
        'name' : doc.name
        'feed' : doc.feed

    field = doc.db

    docu =
        "_id" : "rss-feeds"
        "_rev" : revision

    docu[doc.db] = value

    couch.update("global", docu, (err, resData) ->
        if (err)
            console.error(err);

        console.log(resData)
    );

addRecord = (data) ->
    value =
        'db'    : data.param('rss_db')
        'name'  : data.param('rss_name')
        'feed'  : data.param('rss_feed')
    updateGlobal value

# Start main service

app.get "/", (req, res) ->
    res.render 'index',
        'menuOverview' : true

app.get "/settings", (req, res) ->
    res.render 'settings-index',
        'feeds' : feeds
        'menuSettings' : true

app.get "/settings/rss/add", (req, res) ->
    res.render 'settings/rss/add',
        'menuSettings' : true
        'dbs' : dbs

app.post "/settings/rss/add", (req, res) ->
    addRecord req

app.listen 3000