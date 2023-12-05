require("dotenv").config();
const express = require("express");
const app = express();
// const fetch = require("node-fetch");
// var WebTorrent = require("webtorrent");

const REGEX = {
  season_range:
    /S(?:(eason )|(easons )|(eason)|(easons))?(?<start>\d{1,2})(?:-|&)(?<end>\d{1,2})/, //start and end Sxx-xx|Season(s) xx-xx
  ep_range: /((?:e)|(?:ep))?(?: )?(?<start>\d{1,4})-(?<end>\d{1,4})/, //xxx-xxx
  ep_rangewithS:
    /((?:e)|(?:pisode))\s*(?<start>\d{1,3}(?!\d)|\d\d\d??)(?:-?e?(?<end>\d{1,3}))?(?!\d)/, //Exxx-xxx
};

const SEASONS = ["winter", "spring", "summer", "fall"];
const YEAR = [];

let getSeasons = async () => {
  let url = "https://api.jikan.moe/v4/seasons";
  return fetch(url)
    .then((res) => res.json())
    .then((response) => {
      let last = "1900";
      if (response && response?.data) {
        last = response?.data?.pop();
        last = last["year"] ?? "1900";
      }
      return last;
    })
    .then((last) => {
      last = parseInt(last) ?? 1900;
      let actualYear = new Date().getUTCFullYear();
      let years = [];
      for (_; last <= actualYear; last++) {
        years = [...years, last];
      }
      return years;
    })
    .catch((err) => {
      console.log({ err });
      return [];
    });
};

app
  .get("/manifest.json", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");

    //
    var json = {
      id: "daiki.moe.catalog",
      version: "1.0.0",
      name: "Catalog Moe",
      description: "Anime Movie & TV Catalog",
      logo: "https://raw.githubusercontent.com/daniwalter001/daniwalter001/main/52852137.png",
      resources: [
        {
          name: "stream",
          types: ["movie", "series"],
          idPrefixes: ["tt", "kitsu"],
        },
      ],
      types: ["movie", "series", "anime", "other"],
      catalogs: [],
    };

    return res.send(json);
  })
  .get("/catalog/:type/:id", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");
    //

    YEAR = await getSeasons();

    //
    return res.send();
  })
  .listen(process.env.PORT || 3000, () => {
    console.log("The server is working on " + process.env.PORT || 3000);
  });
