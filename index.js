import * as cheerio from "cheerio";
import * as dotenv from "dotenv";
import puppeteer from "puppeteer";

import suppliers from "./Suppliers.json" assert { type: "json" };

dotenv.config();

(async () => {
  const companyName = process.env.COMPANY_NAME;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const getHTML = async (selector1, selector2) => {
    await page.waitForSelector(selector1);
    await page.click(selector1);
    await page.waitForSelector(selector2);
    const innerHTML = await page.evaluate(() => {
      return document.body.innerHTML;
    });
    return cheerio.load(innerHTML);
  };

  const getCompanies = async () => {
    const companies = [];

    const SE$ = await getHTML('a[href$="default.aspx?id=1703"]', 'a[href$="/?id=1701&itemId=83476"]');

    for (let i = 2; i <= 28; i++) {
      const href = SE$("tbody").children()[i].children[1].children[0].attribs.href;
      const C$ = await getHTML(`a[href$="${href}"]`, "#ctl00_ctl04_ctl00_netprofit_1");
      const companyName = C$("#content").children()[1].children[0].data;
      const netProfit = C$("#ctl00_ctl04_ctl00_netprofit_1")[0].children[0].data;
      companies.push({ companyName: companyName, netProfit: parseFloat(netProfit.split("€")[1].replaceAll(",", ".")) });
      await page.goBack();
    }
    return companies;
  };

  const getProducts = async () => {
    const products = [{ name: "Desktops" }, { name: "Palmtop" }, { name: "Laptop" }, { name: "Gamecomputer" }];
    await page.waitForSelector('a[href$="default.aspx?id=3000"]');
    await page.click('a[href$="default.aspx?id=3000"]');
    const M$ = await getHTML('a[href$="default.aspx?id=3001"]', "#ctl00_ctl04_ctl00_stocktosell_1");
    products.forEach((product, index) => {
      const stock = M$(`#ctl00_ctl04_ctl00_stocktosell_${index + 1}`)[0].children[0].data;
      const price = M$(`#ctl00_ctl04_ctl00_price_${index + 1}`)[0].attribs.value;
      product.stock = parseInt(stock);
      product.price = parseFloat(price);
    });
    const P$ = await getHTML('a[href$="default.aspx?id=3003"]', "#ctl00_ctl04_ctl00_productheadings_1");
    products.forEach((product, index) => {
      const amountToBuy = P$(`#ctl00_ctl04_ctl00_buyproductamount_${index + 1}`)[0].attribs.value;
      const supplier = P$(`#ctl00_ctl04_ctl00_buyproductquality_${index + 1}`)[0].children;
      supplier.forEach((supplier) => {
        if (supplier.attribs) {
          if (supplier.attribs.selected) {
            product.supplier = supplier.children[0].data;
          }
        }
      });
      product.amountToBuy = parseInt(amountToBuy);
      product.newStockAfterPeriod = product.stock + product.amountToBuy;
      product.supplierPrice = suppliers.find((supplier) => supplier.name == product.supplier).prices.find((price) => price.name == product.name).price;
      product.transportCost = 14;
      product.margin = product.price - product.supplierPrice - product.transportCost;
    });
    return products;
  };

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
  const companies = await getCompanies();
  const products = await getProducts();

  const company = companies.find((company) => company.companyName == companyName);
  if (!company) {
    console.error(`Company '${companyName}' not found.`);
    return;
  }

  const higherNetProfitCompanies = companies.filter((companyIL) => company.netProfit > companyIL.netProfit).sort((a, b) => b.netProfit - a.netProfit);
  const lowerNetProfitCompanies = companies.filter((companyIL) => company.netProfit < companyIL.netProfit).sort((a, b) => b.netProfit - a.netProfit);

  console.log("Stock Exchange:");
  console.log(`\nThese ${higherNetProfitCompanies.length} companies have a higher net profit than ${companyName}(${company.netProfit}€):`);
  higherNetProfitCompanies.forEach((company) => console.log(`-${company.companyName}(${company.netProfit}€)`));
  console.log(`\nThese ${lowerNetProfitCompanies.length} companies have a lower net profit than ${companyName}(${company.netProfit}€):`);
  lowerNetProfitCompanies.forEach((company) => console.log(`-${company.companyName}(${company.netProfit}€)`));

  console.log(`\n${companyName}'s products:`);
  products.forEach((product) => {
    console.log(`\n-${product.name}:
    -Stock: ${product.stock}
    -Price: ${product.price}€
    -Amount to buy: ${product.amountToBuy}
    -New stock after period: ${product.newStockAfterPeriod}
    -Supplier: ${product.supplier}
    -Supplier price: ${product.supplierPrice}€
    -Transport cost: ${product.transportCost}€
    -Margin: ${product.margin}€`);
  });
  setTimeout(async () => {
    await browser.close();
  }, 5000);
})();
