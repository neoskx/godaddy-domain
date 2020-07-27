const baseRetailerService = require("bitspider-retailer-sdk");
const txtToJSON = require("txt-file-to-json");
const path = require("path");
const _ = require("lodash");

const triggerFun = async function trigger() {
  let tasks = [];
  const words = txtToJSON({
    filePath: path.join(__dirname, "./words/words-3000.txt"),
  });
  words.forEach((word) => {
    word = word[Object.keys(word)[0]];
    tasks.push(
      baseRetailerService.generateTask({
        url: `https://www.godaddy.com/domainfind/v1/search/exact?q=bit${_.trim(
          word
        )}.com&key=dpp_search&req_id=${Date.now()}`,
        priority: 1,
      })
    );
    tasks.push(
      baseRetailerService.generateTask({
        url: `https://www.godaddy.com/domainfind/v1/search/exact?q=bit${_.trim(
          word
        )}.ai&key=dpp_search&req_id=${Date.now()}`,
        priority: 1,
      })
    );
    tasks.push(
      baseRetailerService.generateTask({
        url: `https://www.godaddy.com/domainfind/v1/search/exact?q=bit${_.trim(
          word
        )}.io&key=dpp_search&req_id=${Date.now()}`,
        priority: 1,
      })
    );
  });

  return {
    tasks,
  };
};

const parseFun = async function parse({ req, res }) {
  try {
    const body = req.body;
    // Add more Tasks
    const tasks = [];
    // Data store to disk
    const storeData = [];

    for (let i = 0; i < body.length; i++) {
      let data = _.get(body[i], "dataset.data.content");
      if (
        _.toLower(_.get(data, "ExactMatchDomain.AvailabilityStatus")) !=
          "1001" &&
        _.toLower(_.get(data, "ExactMatchDomain.AvailabilityStatus")) !=
          "1002" &&
        _.get(data, "ExactMatchDomain.Valuation.Reasons")
      ) {
        storeData.push({
          domain: _.get(data, "ExactMatchDomain.Fqdn"),
          price:
            _.get(data, "ExactMatchDomain.Price") ||
            _.get(data, "ExactMatchDomain.SolutionSets[0].CurrentPrice"),
          value: _.get(data, "ExactMatchDomain.Valuation.Prices.GoValue"),
          reasons: _.get(data, "ExactMatchDomain.Valuation.Reasons"),
        });
      }
    }

    return {
      data: storeData,
      tasks,
    };
  } catch (err) {
    console.log(`parse error: ${err.message}`);
  }
};

// You must set `GLOBAL_ID` and `MUNEW_BASE_URL`
baseRetailerService.setConfigs({
  GLOBAL_ID:
    "c29pOjoxNTkyNzk1NTI1NjAzOjpmZmFkNTI4Zi02NzYyLTRlNmQtOGQyYS05Njk1NzM0YjhkM2Q=",
  MUNEW_BASE_URL: "http://localhost:9099",
  DATA_PATH: path.join(__dirname, "./public/domains.json"),
});
baseRetailerService.init();
baseRetailerService.trigger(triggerFun);
baseRetailerService.parse(parseFun);
baseRetailerService.express();
baseRetailerService.routers();
baseRetailerService.listen();
