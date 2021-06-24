const router = require('express').Router();
const { createHmac } = require("crypto")
const nodemailer = require("nodemailer")
const mongoclient = global.mongoclient;
const fetch = require('node-fetch');
var fs = require('file-system');
const db = mongoclient.db("2handgaming");
router.use("/settings", require("./settings.js"));

router.get("/", (req, res) => {
    res.redirect("/")
})

router.get("/signin", (req, res) => {
    return res.render("signup")
})

router.get("/dashboard", async (req, res) => {
    if (!req.session.user) return res.redirect("/app/signin");
    let user = await db.collection("users").findOne({id: req.session.user});
    if (!user) {
        req.session = null;
        return res.render("error", {error: "This account does not exist anymore!", errorCode: "500"});
    }
    let allListings = await db.collection("listings").find({user: req.session.id});
    let activeListings = await allListings.count();
    allListings = await allListings.toArray();
    var totalViews = 0;
    for (let i = 0; i<allListings.length; i++){
        totalViews = totalViews + allListings[i].views
    }
    var data = {
        spent: user.spent,
        activeListings: activeListings,
        listingViews: totalViews,
        made: user.made
    }
    return res.render("dashboard/dashboard.ejs", {user: user, data: data})
})

module.exports = router;
