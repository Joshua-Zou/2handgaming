const express = require('express');
const app = express();

var secrets;
if (process.env.secrets){
  secrets = JSON.parse(process.env.secrets)
}else{
  secrets = require("./secret.json")
}

let port = process.env.PORT || 42069;
let secret = secrets.sessionSecret;
app.set('port', port);

const session = require('cookie-session');
app.set('trust proxy', 1)

app.set('view engine', 'ejs');
app.use(express.static('static'));
let sessionParser = session({
    secret: secret,
    keys: [secret],
    name: "session",
    resave: false,
    saveUninitialized: false,
})
app.use(sessionParser);

require('./router')(app);

app.listen(port, () => console.info(`Listening on port ${port}`));