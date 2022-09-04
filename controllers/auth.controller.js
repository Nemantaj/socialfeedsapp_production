const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const pass = req.body.password;
  let loadedUser;

  User.findOne({ email: { $regex: email, $options: "i" } })
    .then((user) => {
      if (!user) {
        const error = new Error(
          "Email address does not exists! please try again."
        );
        error.title = "Invalid user information";
        error.statusCode = 422;
        throw error;
      }

      loadedUser = user;

      return bcryptjs.compare(pass, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("The password you entered is incorrect!.");
        error.title = "Invalid user information";
        error.statusCode = 422;
        throw error;
      }

      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "secret",
        { expiresIn: "1h" }
      );

      res.status(200).json({
        token: token,
        userId: loadedUser._id.toString(),
        message: {
          title: "Success",
          msg: "Logging In",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const fname = capitalize(req.body.fname);
  const pass = req.body.password;
  const lname = capitalize(req.body.lname);

  User.findOne({ email: email })
    .then((user) => {
      if (user) {
        const error = new Error(
          "Email address alreday exists! please try again."
        );
        error.title = "Invalid user information";
        error.statusCode = 422;
        throw error;
      }
      if (!email.includes("@")) {
        const error = new Error("Please enter a valid email address!");
        error.title = "Invalid user information";
        error.statusCode = 422;
        throw error;
      }
      if (fname == "" || lname == "") {
        const error = new Error("Please enter a valid user credentials!");
        error.title = "Invalid user information";
        error.statusCode = 422;
        throw error;
      }
      return bcryptjs.hash(pass, 12);
    })
    .then((hashPass) => {
      const user = new User({
        fname: fname,
        lname: lname,
        email: email,
        password: hashPass,
        friends: [],
        posts: 0,
        img: "/uploads/profile/default.jpg",
        imgShowcase: "/uploads/showcase/default.jpg",
        newUser: true,
      });
      return user.save();
    })
    .then((result) => {
      res.json({
        title: "Success",
        msg: "Your account was created successfully!",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
