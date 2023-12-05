const prompt = require("prompt-sync")({ sigint: true });
const { exec, execSync } = require("child_process");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)); //csm mode
const ChromecastAPI = require("chromecast-api");

let _token = null;
let tokenTime = null;

let getDataForTokenRequest = async () => {
  for (let i = 0; i < 2; index++) {
    try {
      let refreshToken = await fetch(
        "https://raw.githubusercontent.com/Samfun75/File-host/main/aniyomi/refreshToken.txt"
      );

      refreshToken =
        refreshToken?.statusText == "OK" ? await refreshToken.text() : "";

      refreshToken = refreshToken.replace(/[\n\r]/gi, "");
      const data = new URLSearchParams();
      data.append("grant_type", "refresh_token");
      data.append("refresh_token", refreshToken);
      data.append("scope", "offline_access");

      let resp = await fetch("https://beta-api.crunchyroll.com/auth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic a3ZvcGlzdXZ6Yy0teG96Y21kMXk6R21JSTExenVPVnRnTjdlSWZrSlpibzVuLTRHTlZ0cU8=",
        },
        body: data.toString(),
      });
      resp = resp?.statusText == "OK" ? await resp.json() : {};
      return resp;
    } catch (error) {
      continue;
    }
  }
};

let getToken = async () => {
  let token = _token;
  let expired = token == null || tokenTime + 300000 <= Date.now();
  console.log({ expired });
  if (expired || token == null || typeof token === "undefined") {
    for (let id = 0; id < 2; id++) {
      try {
        let tokenData = await getDataForTokenRequest();
        let newToken = await fetch(
          "https://beta-api.crunchyroll.com/index/v2",
          {
            method: "GET",
            headers: {
              authorization: `${tokenData.token_type} ${tokenData.access_token}`,
            },
          }
        );
        newToken = newToken?.statusText == "OK" ? await newToken.text() : "";
        let allTokens = JSON.parse(newToken);
        allTokens["token"] = tokenData;
        _token = allTokens;

        tokenTime = Date.now();
        return allTokens;
      } catch (error) {
        continue;
      }
    }
  }
  return token;
};

let getMediaInfo = async (video_id, token) => {
  let resp = await fetch(
    `https://beta-api.crunchyroll.com/content/v2/cms/objects/${video_id}?locale=en-US`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `${token.token_type} ${token.access_token}`,
      },
    }
  );

  resp = resp.statusText == "OK" ? await resp.json() : "error";

  if (!resp || (typeof resp == "string" && resp.includes("error"))) {
    return null;
  }

  let json = resp;

  let lang = json.data[0].episode_metadata.subtitle_locales[0];
  if (json.data[0].episode_metadata.is_dubbed) {
    lang = json.data[0].episode_metadata.audio_locale;
  }
  return [json.data[0].episode_metadata.versions[0].media_guid, lang];
};

let getData = async (video_id) => {
  for (let i = 0; i < 2; i++) {
    let allTokens = await getToken();

    let mediaInfo = await getMediaInfo(video_id, allTokens.token);
    if (mediaInfo == null) {
      continue;
    }
    let mediaId = mediaInfo[0];
    let url = `https://beta-api.crunchyroll.com/cms/v2${allTokens.cms.bucket}/videos/${mediaId}/streams?Policy=${allTokens.cms.policy}&Signature=${allTokens.cms.signature}&Key-Pair-Id=${allTokens.cms.key_pair_id}&locale=fr-FR`;

    let response_media = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `${allTokens.token.token_type} ${allTokens.token.access_token}`,
      },
    });

    response_media =
      response_media.statusText == "OK" ? await response_media.json() : "error";

    if (typeof resp == "string" && response_media.includes("error")) {
      continue;
    }

    return [response_media, mediaInfo[1]];
  }
};

let search = async (searchTerm = "") => {
  let token = await getToken();

  if (token == null) {
    console.log("token null");
    return {};
  }

  for (let i = 0; i < 2; i++) {
    try {
      let api = `https://beta-api.crunchyroll.com/content/v2/discover/search?q=${searchTerm?.replace(
        /\s/g,
        "+"
      )}&n=20&type=series,top_results,movie_listing&preferred_audio_language=fr-FRS&locale=fr-FR`;
      //   )}&n=6&type=series,top_results,movie_listing&preferred_audio_language=en-US&locale=en-US`;

      let res = await fetch(api, {
        headers: {
          Authorization: `${token?.token?.token_type} ${token?.token?.access_token}`,
        },
      });
      if (res.status < 400) {
        let data = await res?.json();

        let topResults =
          data?.data?.find((el) => el["type"] == "top_results") ?? {};
        return "items" in topResults ? topResults["items"] : [];
      }
      return {};
    } catch (error) {
      continue;
    }

    return null;
  }
};

let getSeasons = async (id = "") => {
  let token = await getToken();

  if (token == null) {
    console.log("token null");
    return {};
  }

  let api = `https://beta-api.crunchyroll.com/content/v2/cms/series/${id?.trim()}/seasons?force_locale=&preferred_audio_language=fr-FR&locale=fr-FR`;

  // https://www.crunchyroll.com/content/v2/cms/seasons/GY5VEPZPY/episodes?preferred_audio_language=fr-FR&locale=en-US for episodes

  try {
    let res = await fetch(api, {
      headers: {
        Authorization: `${token?.token?.token_type} ${token?.token?.access_token}`,
      },
    });
    if (res.status < 400) {
      let data = await res?.json();
      if (!data || !data?.data) {
        return [];
      }
      return data?.data;
    }
    console.log(res?.statusText);
    return [];
  } catch (error) {
    console.log({ error });
  }
  return [];
};

let getEps = async (id = "") => {
  let token = await getToken();

  if (token == null) {
    console.log("token null");
    return {};
  }

  let api = `https://beta-api.crunchyroll.com/content/v2/cms/seasons/${id?.trim()}/episodes?preferred_audio_language=fr-FR&locale=fr-FR`;

  let res = await fetch(api, {
    headers: {
      Authorization: `${token?.token?.token_type} ${token?.token?.access_token}`,
    },
  });
  if (res.status < 400) {
    let data = await res?.json();
    if (!data || !data?.data) {
      return [];
    }
    return data?.data;
  }
  console.log(res?.statusText);
  return [];
};

(async () => {
  while (true) {
    let searchTerm = prompt("Search?: ");
    if (searchTerm == "q") {
      clear();
      break;
    }
    let results = await search(searchTerm);

    if (!results) {
      return;
    }

    clear();
    console.log(`Results for '${searchTerm}':\r`);

    while (true) {
      for (i in results) {
        console.log(
          `${(parseInt(i) ?? 0) + 1}. ${results[i]["title"]} - ${
            "series_metadata" in results[i] &&
            results[i]["series_metadata"]["is_dubbed"] == true
              ? "Doublé"
              : "Pas doublé"
          }`
        );
      }

      let choice = prompt("Choice?: ");
      if (choice == "q") {
        clear();
        break;
      }
      choice = parseInt(choice) ?? 1;

      if (choice < 1 || choice > results?.length) {
        console.log("You can't do that.");
        return;
      }
      choice = choice - 1;

      let choiceData = results[choice] ?? {};
      console.log(`Your choice: ${choiceData["title"]}`);

      if (choiceData["id"] == null || choiceData["id"] == "") {
        return;
      }

      let seasons = await getSeasons(choiceData["id"]);

      // console.log({ seasons });

      if (!seasons || seasons?.length == 0) {
        return;
      }

      //================================================

      while (true) {
        clear();

        for (i in seasons) {
          console.log(`${(parseInt(i) ?? 0) + 1}. ${seasons[i]["title"]}`);
        }

        choice = prompt("Season?: ");
        if (choice == "q") {
          clear();
          break;
        }
        choice = parseInt(choice) ?? 1;

        if (choice < 1 || choice > seasons?.length) {
          console.log("You can't do that.");
          return;
        }
        choice = choice - 1;

        choiceData = seasons[choice] ?? {};
        console.log(`Your choice: ${choiceData["title"]}`);

        if (choiceData["id"] == null || choiceData["id"] == "") {
          return;
        }

        //================================================

        let eps = await getEps(choiceData["id"]);

        //================================================

        while (true) {
          clear();
          for (i in eps) {
            console.log(`${(parseInt(i) ?? 0) + 1}. ${eps[i]["title"]}`);
          }

          let epchoice = prompt("Ep?: ");
          if (epchoice == "q") {
            clear();
            console.log("shoud be breaking");
            break;
          }
          epchoice = parseInt(epchoice) ?? 1;

          if (epchoice < 1 || epchoice > eps?.length) {
            console.log("You can't do that.");
            return;
          }
          epchoice = epchoice - 1;

          let epChoiceData = eps[epchoice] ?? {};
          console.log(`Your ep: ${epChoiceData["title"]}`);

          if (epChoiceData["id"] == null || epChoiceData["id"] == "") {
            return;
          }

          //===================================================

          console.log("Getting data");

          let streams = await getData(epChoiceData["id"]);

          extradata = streams[1];
          streams = streams[0];

          let streamsUrls = [];

          for (item in streams["streams"]) {
            // console.log({ [item]: Object.values(streams["streams"][item]) });
            streamsUrls = [
              ...streamsUrls,
              [...Object.values(streams["streams"][item])],
            ];
          }

          streamsUrls = streamsUrls?.reduce((sum, current) => {
            sum = sum.concat(current);
            return sum;
          }, []);

          //================================================

          while (true) {
            clear();
            for (i in streamsUrls) {
              console.log(
                `${(parseInt(i) ?? 0) + 1}. ${epChoiceData["title"]} - ${
                  "hardsub_locale" in streamsUrls[i]
                    ? streamsUrls[i]["hardsub_locale"]
                    : ""
                }`
              );
            }

            choice = prompt("Source?: ");
            if (choice == "q") {
              clear();
              break;
            }
            choice = parseInt(choice) ?? 1;

            if (choice < 1 || choice > streamsUrls?.length) {
              console.log("You can't do that.");
              return;
            }
            choice = choice - 1;

            choiceData = streamsUrls[choice] ?? {};
            console.log(
              `Your choice: ${epChoiceData["title"]} - ${
                "hardsub_locale" in streamsUrls[choice]
                  ? streamsUrls[choice]["hardsub_locale"]
                  : ""
              }`
            );

            if (choiceData["url"] == null || choiceData["url"] == "") {
              return;
            }

            try {
              await playWithMPV(choiceData["url"]);
            } catch (error) {
              console.log({ error });
              break;
            }
          }
        }
      }
    }
  }

  //===================================================
})();

let playWithMPV = async (url = "", cb = () => {}) => {
  if (!url || url == "") {
    return;
  }
  let child = execSync(
    `mpv --profile=low-latency --referrer='https://www.crunchyroll.com' '${url}' `
    // `mpv --profile=low-latency --referrer='https://www.crunchyroll.com' '${url}' `
  );

  interceptSigInt(() => {
    cb();
  });

  console.log({ child: child.toString() });

  let choice = prompt("just to see");
};

let clear = () => {
  console.clear();
};

interceptSigInt = (cb = () => {}) => {
  if (process.platform === "win32") {
    var rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("SIGINT", function () {
      process.emit("SIGINT");
    });
  }

  process.on("SIGINT", function () {
    cb();
  });
};
