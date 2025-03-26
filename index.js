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
  /** path's logic
   * use the dns module to check if the input valid represents a valid url
   *    valid
   *    use the findOne() method to check if the database already contains a matching document
   *        not found
   *        use the estimatedDocumentCount() method to assess the number of items in the database
   *        create a new entry, using the length to create a unique short_url value
   *        save the entry
   *        display pertinent information
   *
   *        found
   *        display pertinent information
   *
   *    invalid
   *    display an error message
   */

  // store in a variable the requested url
  const urlRequest = req.body.url;

  // retrieve the hostname removing from the url (the section between https:// and relative paths)
  const hostname = urlRequest
    .replace(/http[s]?\:\/\//, "")
    .replace(/\/(.+)?/, "");

  // use the hostname in the lookup() function
  dns.lookup(hostname, (lookupErr, addresses) => {
    if (lookupErr) {
      console.log("lookup() error");
    }

    if (!addresses) {
      return res.json({
        error: "invalid URL",
      });
    } else {
      Url.findOne(
        {
          original_url: urlRequest,
        },
        (findOneErr, urlFound) => {
          if (findOneErr) {
            console.log("findOne() error");
          }
          if (!urlFound) {
            Url.estimatedDocumentCount((countErr, count) => {
              if (countErr) {
                return res.send("estimatedDocumentCount() error");
              }
              const url = new Url({
                original_url: urlRequest,
                short_url: count + 1,
              });

              url.save((saveErr, urlSaved) => {
                if (saveErr) {
                  return res.send("save() error");
                }
                res.json({
                  original_url: urlSaved.original_url,
                  short_url: urlSaved.short_url,
                });
              });
            });
          } else {
            res.json({
              original_url: urlFound.original_url,
              short_url: urlFound.short_url,
            });
          }
        }
      );
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
      // findOne() returns either _null_ or _a document_
      // depending on whether or not a document matches the specified property value pair(s)
      // if null, create a new document
      if (!urlFound) {
        res.json({ error: "No short URL found for given input" });
      } else {
        res.redirect(urlFound.original_url);
      } // url found block
    }
  ); // findOne() block
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
