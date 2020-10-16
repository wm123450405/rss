const Information = require("../information");
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
  async parse(page) {
    let infos = await page.evaluate(`$('dl').map(function(){return {title:$(this).children('dt').text(),summary:$(this).children('dd').text(),image:$(this).find('img').attr('data-original'),url:$(this).children('dt').children('a').attr('href')}}).toArray()`);
    if (infos) {
      return infos.filter(info => info.url).map(info => new Information(info.url, info.title, info.summary, info.image));
    } else {
      console.log('no infos');
      return [];
    }
  }
}

module.exports = CnbetaParser;