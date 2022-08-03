import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv;
import fs from "fs";
import workerpool from "workerpool";
const pool = workerpool.pool("./worker.js", {
  maxWorkers: workerpool.cpus * 2,
});

const scrapeRecipe = async (scraper, siteStr, pageIter) => {
  let recipes = [],
    counter = 0;
  const startTime = Date.now();
  console.log("Starting scraper");
  pageIter.map((i) => {
    pool
      .exec(scraper, [i])
      .then((res) => {
        if (res !== undefined && res !== null) {
          res = res.filter((recipe) => {
            return recipe !== null;
          });
          recipes = recipes.concat(res);
        }
        if (pool.stats().activeTasks === 0) {
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          console.log(
            `Successfully scrapped ${recipes.length}recipes in ${duration}s`
          );
          saveData(siteStr, recipes);
          pool.terminate(true);
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  });
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
  scrapeRecipe("getRecipeAr", "ar", pageIter);
} else if (argv.fn) {
  pool.exec("getFnSearchData").then((arr) => {
    scrapeRecipe("getRecipeFn", "fn", arr);
  });
}
