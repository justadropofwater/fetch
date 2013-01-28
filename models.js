/**
 * models.js
 */


// the first thing we always do is store
// the schema constructor as a var
Schema = mongoose.Schema,
// for now we can just store constant values as
// arrays here but this is poor form and should
// eventually get it's own living quarters
priority = ['low','normal','high','critical'],
logtype = ['information','warning','error'];
//now let's connect to the respective db
//and create the schema
mongoose.connect('mongodb://localhost:27017/logs');
logItem = new Schema({
    priority  : Number,
    logtype   : Number,
    datetime  : Date,
    msg       : String
});

mongoose.model('logItem', logItem);
