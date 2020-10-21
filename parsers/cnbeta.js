const Parser = require("../parser");

class CnbetaParser extends Parser {
  constructor() {
    super('https://www.cnbeta.com/')
  }
  get name() {
    return 'cnbeta';
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async refresh(page) {
    page.goto(this.url).catch(e => { });
    await page.waitForSelector('dl');
  }
  async parse(page) {
    let infos = await page.evaluate(`$('dl').map(function(){return {title:$(this).children('dt').text(),summary:$(this).children('dd').text(),image:$(this).find('img').attr('data-original'),url:$(this).children('dt').children('a').attr('href')}}).toArray()`);
    if (infos) {
      return infos.filter(info => info.url);
    } else {
      console.log('no infos');
      return [];
    }
  }
}

module.exports = CnbetaParser;