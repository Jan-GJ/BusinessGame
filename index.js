import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const login = async () => {
    await page.waitForSelector("button[type=submit]");
    await page.click(".selectList");
    await page.click(`[data-lowervalue="${process.env.GAME_NAME}"]`);
    await page.click("#UserData_UserName");
    await page.type("#UserData_UserName", process.env.LOGIN_NAME);
    await page.type("#UserData_Password", process.env.PASSWORD);
    await page.click("button[type=submit]");
  };

  await page.goto("http://game.edumundo.co.uk/", {
    waitUntil: "networkidle2",
  });

  await login();
  await page.waitForSelector('a[href$="default.aspx?id=1703"]');
  await page.click('a[href$="default.aspx?id=1703"]');
  await page.waitForSelector('a[href$="/?id=1701&itemId=83476"]');
  const stockExchangeInnerHTML = await page.evaluate(() => {
    return document.body.innerHTML;
  });
  const SE$ = cheerio.load(stockExchangeInnerHTML);

  const tbody = SE$("tbody");
  for (let i = 2; i <= 28; i++) {
    const href = tbody.children()[i].children[1].children[0].attribs.href;
    await page.waitForSelector(`a[href$="${href}"]`);
    await page.click(`a[href$="${href}"]`);
    await page.waitForSelector("#ctl00_ctl04_ctl00_netprofit_1");
    const companyInnerHTML = await page.evaluate(() => {
      return document.body.innerHTML;
    });
    const C$ = cheerio.load(companyInnerHTML);
    const companyName = C$("#content").children()[1].children[0].data;
    const netProfit = C$("#ctl00_ctl04_ctl00_netprofit_1")[0].children[0].data;

    console.log(`${companyName} - Net Profit: ${netProfit}`);
    await page.goBack();
  }

  setTimeout(async () => {
    await browser.close();
  }, 5000);
})();
