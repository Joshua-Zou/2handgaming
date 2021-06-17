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
        app.use("/app", require("./routes/app.js"));
        app.use("/api", require("./routes/api.js"));
        app.use("/confirm", require("./routes/confirm.js"));
        app.use("/", require("./routes/index.js"));
        app.use(function(req, res) {
            res.status(404).render('404error');
       });
        app.use(function(error, req, res, next) {
            console.log(error)
            res.status(500).render('500error');
        });
    })
}
