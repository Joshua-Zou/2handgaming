const router = require('express').Router();
const { createHmac } = require("crypto")
const nodemailer = require("nodemailer")
const mongoclient = global.mongoclient;

var zxcvbn = require('zxcvbn');
var strength = {
    0: "Worst ☹",
    1: "Bad ☹",
    2: "Weak ☹",
    3: "Good ☺",
    4: "Strong ☻"
}
const db = mongoclient.db("2handgaming");
router.get("/", (req, res) => {
    res.status(400).send("error")
})
router.post("/login", async (req, res) => {
    if (!req.body.email || !req.body.password) return res.send("Email/Password is incorrect!");
    var hashedPassword;
    const hmac = createHmac('sha512', req.body.password);
    hmac.update(JSON.stringify(req.body.email));
    const signature = hmac.digest('hex');
    let user = await db.collection("sellers").findOne({signature: signature, email: req.body.email});
    if (!user) return res.send("Email/Password is incorrect!");
})

router.post('/register', async (req, res) => {
    if (!req.body.email || !req.body.password) return res.send("You must have a email or password!");
    var result = zxcvbn(req.body.password);
    if (result.score < 3) return res.send("Password strength is too low! "+result.feedback.suggestions);
    let user = await db.collection("sellers").findOne({email: req.body.email});
    if (user) return res.send("An account already exists with this email! Try logging in instead");
    let template = await fetch(`${secrets.domain}/html/welcomeTemplate.html`);
    template = await template.text();
    template = template.replace(/UserNameTemplate/g, buyer.email);
    template = template.replace(/BuyerIdTemplate/g, buyer.tunnelId);
    template = template.replace(/AmountTemplate/g, amountOfLtc.toString()+" LITECOIN");
    template = template.replace(/PutContentHereTemplate/g, `<h1 style="text-align: center;">Hello ${buyer.email}!</h1> This is a confirmation to pay: ${amountOfLtc} litecoin. (This includes the current litecoin network fees. Without the fees, your order would be ${usd} USD). &nbsp;<br />If this was you, great! Click the link below to pay! If this wasn't you, no need to panic. All this means, is that someone has your PUBLIC Coin-Tunnel address. (That's why we have these confirmation emails) If you keep getting this email, feel free to regenerate your public key in your dashboard`)
    template = template.replace(/ConfirmationCodeTemplate/g, `https://www.coin-tunnel.ml/validate/${randomid}`)
    sendEmail(req.body.email, "Welcome Aboard!", template)
})

async function sendEmail(reciever, subject, html){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
               user: 'secndhandgaming@gmail.com',
               pass: secrets.gmail_password
           }
       });
       const mailOptions = {
         from: 'secndhandgaming@gmail.com', // sender address
         to: reciever, // list of receivers
         subject: subject,
         html: html
        };
       transporter.sendMail(mailOptions, function (err, info) {
          if(err)
            throw err
         // else
            //console.log(info);
          })
}

module.exports = router;
