const bcrypt = require("bcryptjs");
const express = require("express");
const gravatar = require("gravatar");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const User = require("../../models/User");
const keys = require("../../config/keys");
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

const router = express.Router();

// @route GET api/users/test
// @desc Tests users route
// @access Public
router.get("/test", (req, res) =>
    res.json({
        msg: "Users works.",
    })
);

// @route GET api/users/register
// @desc Register new user
// @access Public
router.post("/register", (req, res) => {
    const { errors, isValid } = validateRegisterInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }
    User.findOne({ email: req.body.email }).then((user) => {
        if (user) {
            errors.email = "Email already exists.";
            return res.status(404).json({ errors });
        } else {
            avatar = gravatar.url(req.body.email, {
                s: "200", // size
                r: "pg", // rating
                d: "mm", // default
            });
            const new_user = new User({
                name: req.body.name,
                email: req.body.email,
                avatar,
                password: req.body.password,
            });

            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(new_user.password, salt, (err, hash) => {
                    if (err) throw err;
                    new_user.password = hash;
                    new_user
                        .save()
                        .then((user) => res.json(user))
                        .catch((err) => console.log(err));
                });
            });
        }
    });
});

// @route GET api/users/login
// @desc Login new user, returning JWT token
// @access Public
router.post("/login", (req, res) => {
    const { errors, isValid } = validateLoginInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }

    const email = req.body.email;
    const password = req.body.password;

    // Find user by email
    User.findOne({ email }).then((user) => {
        if (!user) {
            errors.email = "User not found.";
            return res.status(404).json(errors);
        }

        // Check password
        bcrypt.compare(password, user.password).then((isMatch) => {
            if (isMatch) {
                const payload = {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                };

                // Sign token
                jwt.sign(
                    payload,
                    keys.secretOrKey,
                    { expiresIn: 3600 },
                    (error, token) => {
                        res.json({
                            success: true,
                            token: "Bearer " + token,
                        });
                    }
                );
                // res.json({ msg: "Success" });
            } else {
                errors.password = "Password incorrect";
                return res.status(400).json(errors);
            }
        });
    });
});

// @route GET api/users/current
// @desc Return current user
// @access Public
router.get(
    "/current",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
        return res.json({
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
        });
    }
);
module.exports = router;
