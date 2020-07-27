const baseRetailerService = require("bitspider-retailer-sdk");
const txtToJSON = require("txt-file-to-json");
const path = require("path");
const _ = require("lodash");

async function checkAvailable(){
  try{
    await $$page.waitFor("span.domain-name-text");
    let domainResultStr = await $$page.$eval("span.domain-name-text", elm=>elm.innerText);
    domainResultStr = domainResultStr.split("is") || [];
    let data = {
      domain: domainResultStr[0],
      available: false,
    };
    if (domainResultStr[1] == " available") {
      data.available = true;
      data.price = await $$page.$eval(".price-block .ds-dpp-price", elm=>elm.innerText);
    }
    return {
      url: $$task.url,
      data: {
        contentType: "JSON",
        content: data,
      },
    };
  }catch(err){
    console.error("checkAvailable error: ", err);
  }
}

async function estimatedValue(){
  try{
    await $$page.waitFor("span.dpp-price.price");
    const estimatedValue = await $$page.$eval("span.dpp-price.price", elm=>elm.innerText);
    const data = {
      domain: $$task.metadata.domain,
      price: $$task.metadata.price,
      value: estimatedValue,
    };
    // send data back to AS
    return {
      url: $$task.url,
      data: {
        contentType: "JSON",
        content: data,
      },
    };
  }catch(err){
    console.error("checkAvailable error: ", err);
  }
}

const triggerFun = async function trigger() {
  let tasks = [];
  const words = txtToJSON({
    filePath: path.join(__dirname, "./words/words-3000.txt"),
  });
  words.forEach((word) => {
    word = word[Object.keys(word)[0]];
    tasks.push(
      baseRetailerService.generateTask({
        url: `https://www.godaddy.com/domainsearch/find?segment=repeat&isc=cjc1off30&checkAvail=1&tmskey=&domainToCheck=bit${_.trim(
          word
        )}.com`,
        priority: 1,
        metadata: {
          script: checkAvailable.toString(),
          type: "queryAvailable",
        }
      })
    );
    tasks.push(
      baseRetailerService.generateTask({
        url: `https://www.godaddy.com/domainsearch/find?segment=repeat&isc=cjc1off30&checkAvail=1&tmskey=&domainToCheck=bit${_.trim(
          word
        )}.ai`,
        priority: 1,
        metadata: {
          script: checkAvailable.toString(),
          type: "queryAvailable",
        }
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
      let item = body[i];
      if (item.metadata.type === "queryAvailable") {
        let data = item.dataset.data.content;
        if (data.available) {
          tasks.push(
            baseRetailerService.generateTask({
              url: `https://www.godaddy.com/domain-value-appraisal/appraisal/?isc=goodba003&checkAvail=1&tmskey=&domainToCheck=${_.trim(
                data.domain
              )}`,
              priority: 1,
              metadata: {
                script: estimatedValue.toString(),
                domain: _.trim(data.domain),
                price: _.trim(data.price),
              }
            })
          );
        }
      } else {
        storeData.push(item.dataset.data.content);
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
