const express = require("express");
const app = express();
const cheerio = require("cheerio"); // Basically jQuery for node.js
const axios = require("axios"); // A promised based HTTP client for node.js
const createCsvWriter = require("csv-writer").createObjectCsvWriter; // A CSV writer and parser for node.js
// Setting up env config
const dotenv = require("dotenv");
dotenv.config();
const puppeteer = require("puppeteer");
app.get("/", async (req, res) => {
  try {
    // Defining the Headers for CSV file
    const csvWriter = createCsvWriter({
      path: "./file.csv",
      header: [
        { id: "title", title: "Title" },
        { id: "url", title: "Url" },
        { id: "area", title: "Area of Property" },
        { id: "age", title: "Age" },
      ],
    });
    let title = [];
    let url = [];
    let area = [];
    let age = [];
    let scrapedData = [];
    const scrapeInfiniteScrollItems = async (page, itemTargetCount) => {
      // page is the targeted page
      // itemTargetCount is the number of items to be scraped
      // run a loop till the itemTargetCount is reached
      while (itemTargetCount > title.length) {
        // fetching the title of the property
        title = await page.evaluate(() => {
          const title = Array.from(
            document.querySelectorAll(".nb__2_XSE > section>div>span>h2")
          );
          return title.map((item) => item.innerText);
        });
        // fetching the url of the property
        url = await page.evaluate(() => {
          const url = Array.from(
            document.querySelectorAll(".nb__2_XSE > section>div>span>h2>a")
          );
          return url.map((item) => item.getAttribute("href"));
        });
        // fetching the area of the property
        area = await page.evaluate(() => {
          const area = Array.from(
            document.querySelectorAll(
              ".nb__7nqQI>div:nth-child(1)>div:nth-child(4)>div:nth-child(1)>div"
            )
          );
          return area.map((item) => item.innerText);
        });
        // scrolling the page to the bottom
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.waitForFunction(
          `document.body.scrollHeight > ${previousHeight}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    const browser = await puppeteer.launch({
      headless: false,
    });
    // Calling puppeteer to scrape the data with infinite scroll
    const page = await browser.newPage();
    await page.goto(process.env.URL, { timeout: 0 });
    await scrapeInfiniteScrollItems(page, 50);
    // Getting the age of the property
    for (let i = 0; i < url.length; i++) {
      url[i] = `${process.env.HOST}${url[i]}`;
      const ageresponse = await axios.request({
        method: "GET",
        url: url[i],
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        },
      });
      const $ = cheerio.load(ageresponse.data);
      const agedata = $(
        ".nb__28cwR>div:nth-child(1)>div:nth-child(3)>h5"
      ).text();
      age[i] = agedata;
      const obj = {
        title: title[i],
        url: url[i],
        area: area[i],
        age: agedata,
      };
      scrapedData.push(obj);
    }
    // Writing the data to CSV file
    await csvWriter.writeRecords(scrapedData);
    res.status(200).json({
      success: true,
      message: "CSV file created successfully",
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      success: false,
      message: e.message,
    });
  }
});

const server = app.listen(process.env.PORT || 3601, () =>
  console.log(`Sever Running on port ${process.env.PORT || 3601}`)
);
