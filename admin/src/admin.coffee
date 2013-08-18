# Libaries

express         = require 'express'
hbs             = require 'express3-handlebars'
path            = require 'path'
nodeCouchDB     = require 'node-couchdb'
couch           = new nodeCouchDB("localhost", 5984);

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

# Expres initiation

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



# Get the RSS feeds in Global

updateFeeds = (callback) ->
    # Reset feeds
    result = []
    dbs    = []

    couch.get("global", "rss-feeds", (err, res) ->
        if err
            console.error err
        else
            for key, value of res.data
                if key isnt '_id' and key isnt '_rev' and key isnt '' and key isnt '_revs_info'
                    # Push database into the database array
                    dbs.push key if key in dbs isnt

                    processElement = (element) ->
                        if element?
                            element.db = key
                            result.push element

                    processElement element for element in value

            callback(null,res.data,result,dbs)
    )

# Init

updateGlobal = (doc, callback) ->
    value =
        '_id'  : 0
        'name' : doc.name
        'feed' : doc.feed

    # Get the latest data
    updateFeeds( (err, res) ->
        data = res
        #if field does exsit add record
        if data.hasOwnProperty(doc.db)
            original        = data[doc.db]
            id              = original[original.length-1]['_id'] + 1
            value._id       = id
            original.push value
        else
            data[doc.db] = []
            data[doc.db].push value

        couch.update("global", data, (err, resData) ->
            if (err)
                console.error(err);

            callback(null,true)
        );
    )

spliceFunc = (my_array, element_to_remove) ->
    for key, value of my_array
        if parseInt(value._id) == parseInt(element_to_remove)
            my_array.splice(key, 1)
    my_array

createRecord = (data, callback) ->
    value =
        'db'    : data.param('rss_db')
        'name'  : data.param('rss_name')
        'feed'  : data.param('rss_feed')
    updateGlobal(value,callback)

deleteRecord = (database, id, callback) ->
    updateFeeds( (err, res) ->
        if res.hasOwnProperty(database)
            new_array = spliceFunc(res[database], id)
            if new_array[0]?
                res[database] = new_array
            else
                delete res[database]

            couch.update("global", res, (err, resData) ->
                if (err)
                    console.error(err);

                callback(null,true)
            )
        else
            callback true
    )


# Start main service

app.get "/", (req, res) ->
    res.render 'index',
        'menuOverview' : true

app.get "/settings", (req, res) ->
    updateFeeds( (err, raw, rFeeds, rDbs) ->
        res.render 'settings-index',
            'feeds' : rFeeds
            'menuSettings' : true
    )

app.get "/settings/rss/create", (req, res) ->
    updateFeeds( (err, raw, rFeeds, rDbs) ->
        res.render 'settings/rss/add',
            'menuSettings' : true
            'dbs' : rDbs
    )

app.get "/settings/rss/delete/:database/:id", (req, res) ->
    database    = req.params.database
    id          = req.params.id
    deleteRecord(database, id, (err, cRes) ->
        res.redirect('/settings')
    )

app.post "/settings/rss/create", (req, res) ->
    createRecord(req, (err, cRes) ->
        res.redirect('/settings/rss/create')
    )

app.listen 3000