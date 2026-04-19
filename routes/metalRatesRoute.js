const express = require("express");
const https = require("https");
const router = express.Router();

const SYMBOLS = {
  g:  "XAU",
  s:  "XAG", 
  p:  "XPT",
  pd: "XPD",
  c:  "HG"
};

const fetchFromGoldApi = (symbol) => {
  return new Promise((resolve, reject) => {
    https.get(`https://api.gold-api.com/price/${symbol}/INR`, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on("error", reject);
  });
};

router.get("/", async (req, res) => {
  const symbol = SYMBOLS[req.query.m];
  if (!symbol) return res.status(400).json({ error: "invalid metal" });

  try {
    const data = await fetchFromGoldApi(symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;