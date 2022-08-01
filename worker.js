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
      let recipe = await recipeScraper(link).catch((error) => {
        // Disregard all invalid recipes
        return null;
      });
      return recipe;
    });
    return await Promise.all(fetchAll);
  } catch (error) {
    console.log(error);
  }
};

// get the base links for the search page
const getSearchLinksFn = async () => {
  const url = "https://www.foodnetwork.com/recipes/recipes-a-z/";
  try {
    const response = await fetch(url, { headers });
    const responseBody = await response.text();
    const results = parse(responseBody).querySelectorAll(
      "ul.o-IndexPagination__m-List li a"
    );
    const Reg = new RegExp(/recipes-a-z\/(\w+)/);
    const links = results.map((link) => {
      // Retreive only the page string
      return Reg.exec(link.attributes["href"])[1];
    });
    return links;
  } catch (error) {
    console.log(error);
  }
};

// Loop through links on each search page and retreive recipe data
const getRecipeFn = async (pageStr, pageNum) => {
  const url = `http://www.foodnetwork.com/recipes/recipes-a-z/${pageStr}/p/${pageNum}`;
  try {
    const response = await fetch(url, { headers });
    const responseBody = await response.text();
    const results = parse(responseBody).querySelectorAll(
      "div.o-Capsule__m-Body ul.m-PromoList li a"
    );
    const fetchAll = results.map(async (result) => {
      let link = result.attributes["href"];
      if (!link.match(/\/recipes\//)) return null;
      // Add https to front
      link = "https:" + link;
      let recipe = await recipeScraper(link).catch((error) => {
        // Disregard all invalid recipes
        return null;
      });
      return recipe;
    });
    return await Promise.all(fetchAll);
  } catch (error) {
    console.log(error);
  }
};
// Loop through 
const scrapeFn = async (pageStr) => {
  let recipeSet = true,
    recipeLinks = [],
    pageNum = 1;
  while (recipeSet) {
    recipeSet = await getRecipeFn(pageStr, pageNum);
    if (recipeSet === null) break;
    recipeLinks.push(recipeSet);
    pageNum++;
  }
  return recipeSet;
};

workerpool.worker({
  getRecipeAr: getRecipeAr,
  getRecipeFn: getRecipeFn,
  getSearchLinksFn: getSearchLinksFn,
  scrapeFn: scrapeFn,
});
