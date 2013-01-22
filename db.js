
mongoose.connect(db);

app.use(express.cookieParser());
app.use(express.session({
    cookie: {
        maxAge: 60000 // 1 min as example
    },
    secret: "Wild Express-MongoDB",
    store: new MongooseStore(options)
}));

app.get('/', function(req, res){
    var collection = mongoose.model(options.collection);
    collection.find({}, function (err, sessions) {
        if (err) console.log(err);
        res.send(sessions);
    });
});

app.listen(3000);