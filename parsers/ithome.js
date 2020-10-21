const Parser = require("../parser");

class IthomeParser extends Parser {
  constructor() {
    super('https://www.ithome.com/')
  }
  get name() {
    return 'IT之家';
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async refresh(page) {
    await page.goto(this.url).catch(e => { });
    // await page.waitForSelector('ul.nl>li');
  }
  async parse(page) {
    let infos = await page.evaluate(`$('ul.nl li').map(function() {return {title: $(this).children('a').text(), url: $(this).children('a').attr('href')}}).toArray().slice(0, 90)`);
    if (infos) {
      return infos.filter(info => info.url);
    } else {
      console.log('no infos');
      return [];
    }
  }
}

module.exports = IthomeParser;