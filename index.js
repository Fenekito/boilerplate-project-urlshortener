require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
const bodyParser = require("body-parser");

let mongoose;
try {
  mongoose = require("mongoose");
  mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
} catch (e) {
  console.log(e);
}

const { Schema } = mongoose;

// Basic Configuration
const port = process.env.PORT || 3000;

const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, default: 0 },
});
const Url = mongoose.model("Url", urlSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", (req, res) => {
  const hostname = new URL(req.body.url).hostname;
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    } else {
      Url.findOne({ original_url: req.body.url }, (findOneErr, urlFound) => {
        if (findOneErr) {
          console.log("findOne() error");
        }
        if (!urlFound) {
          Url.countDocuments({}, (countErr, count) => {
            if (countErr) {
              console.log("countDocuments() error");
            }
            const newUrl = new Url({
              original_url: req.body.url,
              short_url: count + 1,
            });
            newUrl.save((saveErr, savedUrl) => {
              if (saveErr) {
                console.log("save() error");
              }
              res.json({
                original_url: savedUrl.original_url,
                short_url: savedUrl.short_url,
              });
            });
          });
        } else {
          res.json({
            original_url: urlFound.original_url,
            short_url: urlFound.short_url,
          });
        }
      });
    }
  });
});

app.get("/api/shorturl/:shorturl", function (req, res) {
  Url.findOne(
    { short_url: req.params.shorturl.toString() },
    (findOneErr, urlFound) => {
      if (findOneErr) {
        console.log("findOne() error");
      }
      if (!urlFound) {
        res.json({ error: "No short URL found for given input" });
      } else {
        res.redirect(urlFound.original_url);
      }
    }
  );
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
