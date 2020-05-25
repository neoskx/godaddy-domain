var express = require("express");
const _ = require("lodash");
var router = express.Router();

//================================
// Axios used to send HTTP Request
const axios = require("axios");
const fs = require("fs-extra");
const txtToJSON = require("txt-file-to-json");
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
    baseURL: process.env.MUNEW_BASE_URL || "http://localhost:9099",
    url: "/apis/intelligences",
    method: "POST",
    data: intelligences,
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
        process.env.GLOBAL_ID ||
        "c29pOjoxNTgyNDA5MTYzMTYyOjplNTFiYzYyMS1iMWFhLTQ1MTMtYTIxYi1lMTNmZGIxZDAwYjY=",
    },
    priority: priority || 100,
    suitableAgents: ["SERVICE"],
    metadata: metadata,
    url: url,
  };
}

/* Analyst Service - GET /apis/intelligences/init */
router.get("/init", function (req, res, next) {
  let needCollectIntelligences = [];
  const words = txtToJSON({
    filePath: path.join(__dirname, "./words-3000.txt"),
  });
  words.forEach((word) => {
    word = word[Object.keys(word)[0]];
    console.log(word);
    needCollectIntelligences.push(
      generateIntelligence(
        `https://www.godaddy.com/domainfind/v1/search/exact?q=bit${_.trim(
          word
        )}.com&key=dpp_search&req_id=${Date.now()}`,
        1
      )
    );
    needCollectIntelligences.push(
      generateIntelligence(
        `https://www.godaddy.com/domainfind/v1/search/exact?q=bit${_.trim(
          word
        )}.ai&key=dpp_search&req_id=${Date.now()}`,
        1
      )
    );
    needCollectIntelligences.push(
      generateIntelligence(
        `https://www.godaddy.com/domainfind/v1/search/exact?q=bit${_.trim(
          word
        )}.io&key=dpp_search&req_id=${Date.now()}`,
        1
      )
    );
  });
  // because we have two kind pages, so to distinguish which page if currently intelligence for, we add a **type** property in metadata.
  // we want **bloglist** page to be crawled first, so set priority to 1

  let sendIntervalHandler = setInterval(() => {
    // no more intelligences
    if (!needCollectIntelligences.length) {
      clearInterval(sendIntervalHandler);
    }

    let intelligences = needCollectIntelligences.splice(0, 100);
    // console.log(intelligences);
    sendToMunewEngine(intelligences)
      .then((result) => {
        console.log(result.data);
      })
      .catch((err) => {
        console.error("sendToMunewEngine fail: ", err);
      });
  }, 5 * 1000);

  res.json({
    total: words.length * 3,
  });
});

/* Analyst Service - POST /apis/intelligences */
router.post("/", function (req, res, next) {
  try {
    let collectedIntelligences = req.body;
    // console.log("receive data: ", collectedIntelligences);
    // Intelligences that need collected by Agent
    let needCollectIntelligences = [];
    // Collected data
    let collectedData = [];

    for (let i = 0; i < collectedIntelligences.length; i++) {
      let data = _.get(collectedIntelligences[i], "dataset.data.content");
      if (
        _.toLower(_.get(data, "ExactMatchDomain.AvailabilityStatus")) !=
          "1001" &&
        _.toLower(_.get(data, "ExactMatchDomain.AvailabilityStatus")) != "1002"
        && _.get(data, "ExactMatchDomain.Valuation.Reasons")
      ) {
        collectedData.push({
          domain: _.get(data, "ExactMatchDomain.Fqdn"),
          price: _.get(data, "ExactMatchDomain.Price") || _.get(data, "ExactMatchDomain.SolutionSets[0].CurrentPrice"),
          value: _.get(data, "ExactMatchDomain.Valuation.Prices.GoValue"),
          reasons: _.get(data, "ExactMatchDomain.Valuation.Reasons"),
        });
      }
    }
    //------------------------------------------------------------------------------------------
    // Add more intelligences to Munew
    if (needCollectIntelligences.length) {
      // console.log("==============needCollectIntelligences");
      // console.log(needCollectIntelligences);
      sendToMunewEngine(needCollectIntelligences)
        .then((result) => {
          console.log(result.data);
        })
        .catch((err) => {
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
