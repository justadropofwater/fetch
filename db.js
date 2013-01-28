/**
 * db.js
 */


databaseUrl = "mongodb://localhost:27017/testdb";
collections = ["testCollection1", "authRequests", "users","messages"];
// this will switch over to express-mongodb
db = require("mongojs").connect(databaseUrl, collections);

global_counter = 0;
all_active_connections = {};