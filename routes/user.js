const express = require("express");

const userController = require("../controllers/user.controller");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get(
  "/user/delete-request/:userId",
  isAuth,
  userController.deleteRequest
);

router.get("/user/get-user/:userId", isAuth, userController.getUser);

router.get("/user/search", isAuth, userController.searchUser);

router.get(
  "/user/search-friends/:userId",
  isAuth,
  userController.searchUserFriends
);

router.get(
  "/user/get-friends-list/:userId",
  isAuth,
  userController.getFriendList
);

router.post(
  "/user/finish-setup/:userId",
  isAuth,
  userController.finishUserSetup
);

router.put(
  "/user/change-profile-image/:userId",
  isAuth,
  userController.changeProfileImage
);

router.put(
  "/user/change-showcase-image/:userId",
  isAuth,
  userController.changeProfileShowcase
);

router.put(
  "/user/change-password/:userId",
  isAuth,
  userController.changePassword
);

router.put(
  "/user/change-user-info/:userId",
  isAuth,
  userController.changeUserInfo
);

router.put(
  "/user/change-user-bio/:userId",
  isAuth,
  userController.changeUserBio
);

router.put(
  "/user/change-user-work/:userId",
  isAuth,
  userController.changeUserWork
);

router.post("/user/send-request", isAuth, userController.sendRequest);

router.get(
  "/user/get-friend-status/:userId",
  isAuth,
  userController.checkIsFriends
);

router.get("/user/get-requests/:userId", isAuth, userController.getRequests);

router.get("/user/accept-request/:userId", isAuth, userController.acceptFriend);

router.get("/user/unfriend-request/:userId", isAuth, userController.unfriend);

module.exports = router;
