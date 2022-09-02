import { parse } from "node-html-parser";
import workerpool from "workerpool";
import fetch from "node-fetch";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5115.0 Safari/537.36",
};

const getRecipesBBC = async (pageNum) => {
  try {
    const url = `https://www.bbcgoodfood.com/search/recipes/page/${pageNum}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.log(`Failed to fetch ${url}`);
      return;
    }
    const responseBody = await response.text();
    const results = parse(responseBody).querySelectorAll(
      "div.standard-card-new__display-row > h4 > a"
    );
    const fetchAll = results.map(async (result) => {
      let link = result.attributes["href"];
      if (!link.match(/\/premium\//) && !link.match(/\/recipes\//)) return null;
      // Add https to front
      link = "https://www.bbcgoodfood.com" + link;
      let recipe = await extractRecipeDataBBC(link).catch((error) => {
        // Disregard all invalid recipes
        return;
      });
      return recipe;
    });
    return await Promise.all(fetchAll);
  } catch (error) {
    return;
  }
};
const extractRecipeDataBBC = async (urlPostFix) => {
  let failedUrls = [];
  try {
    const url = `https://www.bbcgoodfood.com/${urlPostFix}`;
    let response = await fetch(url, { headers });

    if (!response.ok) {
      console.log(`Failed to fetch ${url}`);
      // Retry timed out requests 4 times
      if (response.status === 408) {
        for (let i = 0; i < 4; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          response = await fetch(url, { headers });
          if (response.ok) break;
        }
      } else return;
    }
    // If all retrys failed just quit
    if (!response.ok) {
      console.log(`Failed to fetch ${url}`);
      return;
    }
    const html = await response.text();

    // They have a script section which contains json data of current recipe
    const json = JSON.parse(
      parse(html).querySelector("#__NEXT_DATA__").innerHTML
    );

    // Fetch similiar recipes from bbc's api
    let url2 =
      "https://related-content-production.headless.imdserve.com/?contentRequest=";
    // Data needed for backend
    const body = {
      siteKey: "bbcgoodfood",
      postId: parseInt(json.props.pageProps.postId),
      searchTerm: json.props.pageProps.schema.name,
      pinned: [],
      widgetLimit: 8,
      categories: [],
      type: ["sxs-recipe"],
      showCardLabels: false,
      v5enabled: false,
    };
    url2 += encodeURIComponent(JSON.stringify(body));
    const apiResponse = await fetch(url2);
    const similiarRecipes = await apiResponse.json();

    const recipeData = {
      _id: parseInt(json.props.pageProps.postId),
      name: json.props.pageProps.schema.name,
      description: json.props.pageProps.schema.description,
      author: json.props.pageProps.authors[0].name,
      slug: json.props.pageProps.slug,
      date: json.props.pageProps.schema.datePublished,
      rating: json.props.pageProps.userRatings,
      keywords: json.props.pageProps.schema.keywords
        ? json.props.pageProps.schema.keywords.split(", ")
        : [],
      nutritionalInfo: json.props.pageProps.nutritionalInfo,
      category: json.props.pageProps.schema.recipeCategory
        ? json.props.pageProps.schema.recipeCategory.split(", ")
        : [],
      diet: json.props.pageProps.diet ? json.props.pageProps.diet : [],
      cuisine: json.props.pageProps.schema.recipeCuisine
        ? json.props.pageProps.schema.recipeCuisine
        : [],
      ingredients: json.props.pageProps.ingredients,
      instructions: json.props.pageProps.schema.recipeInstructions,
      yield: parseInt(json.props.pageProps.schema.recipeYield),
      image: json.props.pageProps.image,
      skillLevel: json.props.pageProps.skillLevel,
      time: {
        prepTime: json.props.pageProps.cookAndPrepTime.preparationMax / 60,
        cookTime: json.props.pageProps.cookAndPrepTime.cookingMax / 60,
        totalTime: json.props.pageProps.cookAndPrepTime.total / 60,
      },
      similiarRecipes,
    };
    return recipeData;
  } catch (error) {
    return;
  }
};

workerpool.worker({
  getRecipesBBC: getRecipesBBC,
});
