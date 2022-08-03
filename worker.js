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
const getFnSearchData = async () => {
  const indexes = ['123','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','xyz'];
  const url = "https://www.foodnetwork.com/recipes/recipes-a-z/";
  let searchData = [];
  const fetchData = indexes.map(async (index) => {
    try {
      const response = await fetch(`${url}${index}`, { headers });
      const responseBody = await response.text();
      const results = parse(responseBody).querySelectorAll(
        "li.o-Pagination__a-ListItem > a.o-Pagination__a-Button"
      );
      // If index only have 1 page return index/1
      if (!results) searchData.push(`${index}/${1}`);
      const pages = results[results.length - 2].text;
      for (let page = 1; page < pages; page++) {
        searchData.push(`${index}/${page}`);
      }
    } catch (error) {
      console.log(error);
    }
    return searchData;
  });
  await Promise.all(fetchData);
  return searchData;
};

// Loop through links on each search page and retreive recipe data
const getRecipeFn = async (searchStr) => {
  const pageStr = searchStr.split("/")[0];
  const pageNum = searchStr.split("/")[1];
  const url = `http://www.foodnetwork.com/recipes/recipes-a-z/${pageStr}/p/${pageNum}`;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const responseBody = await response.text();
    const results = parse(responseBody).querySelectorAll(
      "div.o-Capsule__m-Body ul.m-PromoList > li > a"
    );
    const fetchAll = results.map(async (result) => {
      let link = result.attributes["href"];
      if (!link.match(/\/recipes\//)) return null;
      // Add https to front
      link = "https:" + link;
      let recipe = await recipeScraper(link).catch((error) => {
        // Disregard all invalid recipes
        return;
      });
      return recipe;
    });
    return await Promise.all(fetchAll);
  } catch (error) {
    console.log(error);
    return;
  }
};

workerpool.worker({
  getRecipeAr: getRecipeAr,
  getRecipeFn: getRecipeFn,
  getFnSearchData: getFnSearchData,
});
