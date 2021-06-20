
const router = require('express').Router();
const mongoclient = global.mongoclient;
const db = mongoclient.db("2handgaming");

router.get("/", async (req, res) => {
    var user = null;
    if (req.session.user){
        user = await db.collection("users").findOne({id: req.session.user});
        if (!user) user = null;
    }
    res.render("index", {user: user})
})
router.get("/testerror", (req, res) => {
    res.render("500error")
})
module.exports = router;
