import { parse } from "node-html-parser";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv;

import fetch from "node-fetch";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5115.0 Safari/537.36",
};

import recipeScraper from "recipe-scraper";
import fs from "fs";

const getRecipeAr = async (pageNum,recipeData) => {
  const baseUrl = "https://www.allrecipes.com";
  const searchUrl = "search/?page";
  const url = `${baseUrl}/${searchUrl}=${pageNum}`;

  try {
    const response = await fetch(url, { headers });
    const responseBody = await response.text();
    const results = parse(responseBody).querySelectorAll(".searchResult__titleLink");
    const promises = results.map(async(result) => {
      const link = result.attributes["href"];
      if (link.match(/\/recipe\//)) {
       recipeData.push(await recipeScraper(link));
       return recipeData;
      }
    });
    return Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
};

const scrapeRecipe = async (siteStr, pageIter) => {
  let recipes = [];
  let scraper;
  if (siteStr === "ar") {
    scraper = getRecipeAr;
  }
  let i = 0;
  for (i in pageIter) {
    await scraper(i,recipes);
  }
  saveData(siteStr,recipes);
};

const saveData = (siteStr, recipeData) => {
  const data = JSON.stringify(recipeData);
  fs.writeFile(`data_${siteStr}.json`, data, (err) => {
    if (err) {
      console.error(err);
    }
  });
};

let pageIter;

if (argv.ar) {
  pageIter = Array.from(
    new Array(argv.pages + argv.start),
    (x, i) => i + argv.start
  );
  scrapeRecipe("ar", pageIter);
}
