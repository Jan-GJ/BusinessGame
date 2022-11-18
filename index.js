import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
  const browser = await puppeteer.launch({ headless: true });
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
  const netProfits = [];
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
    netProfits.push({ companyName: companyName, netProfit: parseFloat(netProfit.split("€")[1].replaceAll(",", ".")) });

    await page.goBack();
  }

  const pear = netProfits.find((company) => company.companyName == process.env.COMPANY_NAME);
  const higherNetProfitCompanies = netProfits.filter((company) => company.netProfit > pear.netProfit).sort((a, b) => b.netProfit - a.netProfit);
  const lowerNetProfitCompanies = netProfits.filter((company) => company.netProfit < pear.netProfit).sort((a, b) => b.netProfit - a.netProfit);
  console.log("===Stock Exchange===");
  console.log(pear);
  console.log(`Higher net profit than ${process.env.COMPANY_NAME} ${higherNetProfitCompanies.length}`);
  console.log(higherNetProfitCompanies);
  console.log(`Lower net profit than ${process.env.COMPANY_NAME} ${lowerNetProfitCompanies.length}`);
  console.log(lowerNetProfitCompanies);
  console.log("===Marketing and Purchasing===");
  const products = [{ name: "Desktops" }, { name: "Palmtop" }, { name: "Laptop" }, { name: "Gamecomputer" }];

  await page.waitForSelector('a[href$="default.aspx?id=3000"]');
  await page.click('a[href$="default.aspx?id=3000"]');
  await page.waitForSelector('a[href$="default.aspx?id=3001"]');
  await page.click('a[href$="default.aspx?id=3001"]');
  await page.waitForSelector("#ctl00_ctl04_ctl00_stocktosell_1");
  const marketingInnerHTML = await page.evaluate(() => {
    return document.body.innerHTML;
  });
  const M$ = cheerio.load(marketingInnerHTML);
  products.forEach((product, index) => {
    const stock = M$(`#ctl00_ctl04_ctl00_stocktosell_${index + 1}`)[0].children[0].data;
    const price = M$(`#ctl00_ctl04_ctl00_price_${index + 1}`)[0].attribs.value;
    product.stock = parseInt(stock);
    product.price = parseFloat(price);
  });

  await page.waitForSelector('a[href$="default.aspx?id=3003"]');
  await page.click('a[href$="default.aspx?id=3003"]');
  await page.waitForSelector("#ctl00_ctl04_ctl00_productheadings_1");
  const purchasingInnerHTML = await page.evaluate(() => {
    return document.body.innerHTML;
  });
  const P$ = cheerio.load(purchasingInnerHTML);

  console.log(products);
  setTimeout(async () => {
    await browser.close();
  }, 5000);
})();
