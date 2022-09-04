const express = require("express");
const { check } = require("express-validator");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/signup", authController.postSignup);

router.post("/login", authController.postLogin);

// router.get("/auth-checker", authController.authCheck);

// router.post("/logout", authController.logout);

module.exports = router;
