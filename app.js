var express = require('express'),
mongoose = require('mongoose'),
MongooseStore = require('express-mongodb'),
db = "mongodb://localhost:27017/test";

mongoose.connect(db);
var app = express()

app.configure(function () {
  /* Other configuration options excluded. */
  app.use(express.cookieParser())
  app.use(express.session({
    store : new MongooseStore({connection : db})
  }))
  
  /* ... */
})

app.get('/sessions', function (req, res) {
  var collection = db.model('sessions');
  collection.find({}, function (err, sessions) {
    if (err) {
      res.json(err)
      return
    }
 
    res.json(sessions)
  })
})