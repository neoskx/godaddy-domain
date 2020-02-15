var express = require("express");
var router = express.Router();

//================================
// Axios used to send HTTP Request
const axios = require("axios");
const fs = require("fs-extra");
const cheerio = require("cheerio");
const path = require("path");

/**
 * Add intelligences to Munew Engine
 * @param {array} intelligences - Array of intelligences want to be added
 * @returns {Promise}
 */
function sendToMunewEngine(intelligences) {
  let reqConfig = {
    //**********************************
    // YOU MUST DO 1
    //**********************************
    // Change to correct Munew Engine URL
    // https://docs.munew.io/how-tos/how-to-get-munew-port-number-in-desktop-application
    baseURL: "http://localhost:9099",
    url: "/apis/intelligences",
    method: "POST",
    data: intelligences
  };

  return axios.request(reqConfig);
}

/**
 * Based on passed url, priority and metadata generate an intelligence object
 * You can find intelligence schema from https://docs.munew.io/api/munew-engine-restful-api#request-body-array-item-schema
 *
 * @param {string} url
 * @param {number} priority
 * @param {object} metadata
 * @returns {object} - intelligence object
 */
function generateIntelligence(url, priority, metadata) {
  return {
    soi: {
      //**********************************
      // YOU MUST DO 2
      //**********************************
      // change to your Analyst Service Global ID
      globalId:
        "c29pOjoxNTgxNzM5MzUzNTc1OjpjNTFiODZlNS1iMTQ5LTRhYmItYTA5YS0xZmY5NDRiMWVmYzY="
    },
    priority: priority || 100,
    metadata: metadata,
    url: url
  };
}

/* Analyst Service - GET /apis/intelligences/init */
router.get("/init", function(req, res, next) {
  let needCollectIntelligences = [];

  // because we have two kind pages, so to distinguish which page if currently intelligence for, we add a **type** property in metadata.
  // we want **bloglist** page to be crawled first, so set priority to 1
  needCollectIntelligences.push(
    generateIntelligence("http://exampleblog.munew.io/", 1, {
      type: "bloglist"
    })
  );
  sendToMunewEngine(needCollectIntelligences)
    .then(result => {
      res.json(result.data);
    })
    .catch(err => {
      console.error("sendToMunewEngine fail: ", err);
      res.status(500).end();
    });
});

/* Analyst Service - POST /apis/intelligences */
router.post("/", function(req, res, next) {
  try {
    let collectedIntelligences = req.body;
    // Intelligences that need collected by Agent
    let needCollectIntelligences = [];
    // Collected data
    let collectedData = [];

    for (let i = 0; i < collectedIntelligences.length; i++) {
      let item = collectedIntelligences[i];
      // req.body - https://docs.munew.io/api/munew-engine-restful-api#request-body-array-item-schema
      let data = item.dataset.data.content;

      // You can find how to use cheerio from https://cheerio.js.org/
      // cheerio: Fast, flexible & lean implementation of core jQuery designed specifically for the server.
      let $ = cheerio.load(data);

      let targetBaseURL = "http://exampleblog.munew.io/";
      if (item.metadata.type == "bloglist") {
        // get all blogs url in blog list page
        let blogUrls = $("div.post-preview a");
        for (let i = 0; i < blogUrls.length; i++) {
          let $blog = blogUrls[i];
          $blog = $($blog);
          let url = new URL($blog.attr("href"), targetBaseURL).toString();
          needCollectIntelligences.push(
            generateIntelligence(url, 2, {
              type: "blog"
            })
          );
        }
        let nextUrl = $("ul.pager li.next a").attr("href");
        if (nextUrl) {
          nextUrl = new URL(nextUrl, targetBaseURL).toString();
          needCollectIntelligences.push(
            generateIntelligence(nextUrl, 1, {
              type: "bloglist"
            })
          );
        }
      } else if (item.metadata.type == "blog") {
        collectedData.push({
          title: $("div.post-heading h1").text(),
          author: $("div.post-heading p.meta span.author").text(),
          date: $("div.post-heading p.meta span.date").text(),
          content: $("div.post-container div.post-content").text(),
          url: item.dataset.url
        });
      } else {
        console.error("unknown type");
      }
    }

    //------------------------------------------------------------------------------------------
    // Add more intelligences to Munew
    if (needCollectIntelligences.length) {
      sendToMunewEngine(needCollectIntelligences)
        .then(result => {
          console.log("sendToMunewEngine successful");
        })
        .catch(err => {
          console.error("sendToMunewEngine fail: ", err);
        });
    }

    // save crawl data to json
    let dataPath = path.join(__dirname, "../public/data.json");
    fs.ensureFileSync(dataPath);
    let crawledData = fs.readFileSync(dataPath, "utf8");
    if (!crawledData || !crawledData.length) {
      crawledData = [];
    } else {
      crawledData = JSON.parse(crawledData);
    }
    crawledData = crawledData.concat(collectedData);
    fs.writeJSONSync(dataPath, crawledData);

    // response back 200
    res.status(200).end();
  } catch (err) {
    // when you received intelligences, you should return 200. 
    res.status(200).end();
  }
});

module.exports = router;
