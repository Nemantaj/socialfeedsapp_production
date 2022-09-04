const path = require("path");

const express = require("express");
const parser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const postRoutes = require("./routes/post");
const notifRoutes = require("./routes/notif");
const commentRoutes = require("./routes/comment");
const chatRoutes = require("./routes/chat");
const convosRoutes = require("./routes/convos");

const PORT = process.env.PORT || 3001;
const corsOptions = {
  origin: true,
  credentials: true,
  optionSuccessStatus: 200,
};
const MONGODB_URI =
  "mongodb+srv://cluster0:8349727696Mini@cluster0.eoeoink.mongodb.net/?retryWrites=true&w=majority";

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") +
        "-" +
        file.fieldname +
        path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const app = express();

app.use(express.static(path.join(__dirname, "build")));
app.use(cors(corsOptions));
app.use(parser.json());
app.use(parser.urlencoded({ extended: true }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single("img"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(authRoutes);
app.use(userRoutes);
app.use(postRoutes);
app.use(notifRoutes);
app.use(commentRoutes);
app.use(chatRoutes);
app.use(convosRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  let status = error.statusCode;
  if (!status) {
    status = 422;
  }
  res.status(status).json({
    title: error.title,
    msg: error.message,
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./build/index.html"));
});

mongoose
  .connect(MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then((res) => {
    console.log("Connected!");
    const server = app.listen(PORT, () => {
      console.log(`listening on PORT ${PORT}`);
    });
    const io = require("./socket").init(server);
    io.on("connection", function (socket) {
      io.to(socket.id).emit("client-connect", { id: socket.id });
      console.log("Client Connected!");
    });
  })
  .catch((err) => console.log(err));
