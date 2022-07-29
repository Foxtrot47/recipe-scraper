import { parse } from "node-html-parser";
import recipeScraper from "recipe-scraper";
import workerpool from "workerpool";
import fetch from "node-fetch";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5115.0 Safari/537.36",
};

const getRecipeAr = async (pageNum) => {
  const baseUrl = "https://www.allrecipes.com";
  const searchUrl = "search/?page";
  const url = `${baseUrl}/${searchUrl}=${pageNum}`;
  let recipes = [];
  try {
    const response = await fetch(url, { headers });
    const responseBody = await response.text();
    const results = parse(responseBody).querySelectorAll(
      ".searchResult__titleLink"
    );
    const fetchAll = results.map(async (result) => {
      const link = result.attributes["href"];
      if (!link.match(/\/recipe\//)) return null;
      let recipe = await recipeScraper(link);
      return recipe;
    });
    return await Promise.all(fetchAll);
  } catch (error) {
    console.log(error);
  }
};

workerpool.worker({
  getRecipeAr: getRecipeAr,
});
