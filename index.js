const express = require("express");
const app = express();
const cheerio = require("cheerio"); // Basically jQuery for node.js
const axios = require("axios"); // A promised based HTTP client for node.js
const createCsvWriter = require("csv-writer").createObjectCsvWriter; // A CSV writer and parser for node.js
// Setting up env config
const dotenv = require("dotenv");
dotenv.config();

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
    // Making a GET request to the URL
    const response = await axios.request({
      method: "GET",
      url: process.env.URL,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      },
    });
    // with the help of cheerio we are loading the response data
    const $ = cheerio.load(response.data);
    const scrapedData = [];
    const title = [];
    const url = [];
    const area = [];
    const age = [];
    // Getting the desired data from the HTML
    const htmlElement = $(".infinite-scroll-component ")
      .find(".nb__2_XSE")
      .each(async (index, element) => {
        const property_name = $(element).find("section>div>span>h2").text();
        title.push(property_name);
        const property_url = $(element)
          .find("section>div>span>h2>a")
          .attr("href");
        url.push(`${process.env.HOST}${property_url}`);
        const property_area = $(element)
          .find(".nb__7nqQI>div>div:nth-child(4)>div>div")
          .text();
        area.push(property_area);
      });
    // Getting the age of the property
    for (let i = 0; i < url.length; i++) {
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
      age.push(agedata);
      const obj = {
        title: title[i],
        url: url[i],
        area: area[i],
        age: age[i],
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
    res.status(400).json({
      success: false,
      message: e.message,
    });
  }
});

const server = app.listen(process.env.PORT || 3601, () =>
  console.log(`Sever Running on port ${process.env.PORT || 3601}`)
);
