# Libaries

express = require 'express'
hbs     = require 'express3-handlebars'
path    = require 'path'
nano    = require('nano')('http://192.168.1.15:5984')

# Predefinitions

app = express()

app.configure( () ->
    app.set('views', __dirname + '/views')
    app.engine('handlebars', hbs({defaultLayout: 'main'}))
    app.set('view engine', 'handlebars')
    app.use(express.favicon())
    app.use(express.logger('dev'))
    app.use(express.bodyParser())
    app.use(express.methodOverride())
    app.use(app.router)
    app.use(express.static(path.join(__dirname, 'public')))
)

db = nano.use 'global'

# Global variables

revision    =
    'rss-feeds' : ''
feeds  = ''


# Main program

# Get the RSS feeds in Global

db.get('rss-feeds', { revs_info: true }, (err, body) ->
    if err
        console.log err
    else
        revision['rss-feeds']   = body._rev
        feeds                   = body.feeds

        #db.insert({'_rev' : revision['rss-feeds'], feeds}, 'rss-feeds', (err,body) ->
        #    if err
        #        console.log err
        #    else
        #        console.log body
        #)

)

update_global = (doc) ->
    db.insert({'_rev' : revision[doc], content}, doc, (err,body) ->
        if err
            console.log err
        else
            console.log body
    )




# Start main service

app.get "/", (req, res) ->
    res.render 'index',
        'feeds': feeds
        'title' : 'test'

app.listen 3000