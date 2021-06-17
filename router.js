const { functions } = require('lodash');

module.exports = (app) => {
    const secrets = global.secrets;
    const {MongoClient} = require('mongodb');
    const uri = secrets.mongodb;
    global.functions = {}
    global.functions.sleep = function (ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    const mongoclient = new MongoClient(uri, {poolSize: 10, bufferMaxEntries: 0, useNewUrlParser: true,useUnifiedTopology: true});
    mongoclient.connect(async function(err, mongoclient){
        //const functions = global.functions;
        global.mongoclient = mongoclient;
        //await functions.sleep(1000)
        app.use("/seller", require("./routes/seller.js"));
        app.use("/api", require("./routes/api.js"));
        app.use("/", require("./routes/index.js"));
    })
}
