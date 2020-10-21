const Parser = require("../parser");

class DonewsParser extends Parser {
  constructor() {
    super('https://www.donews.com/')
  }
  get name() {
    return 'DoNews';
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async refresh(page) {
    page.goto(this.url).catch(e => { });
    await page.waitForSelector('.left>a.news-item');
  }
  async parse(page) {
    let infos = await page.evaluate(`$('.left a.news-item').map(function() {return {title:$(this).find('.title').text(), summary:$(this).find('desc').text(), image:$(this).find('img').attr('src'), url:$(this).attr('href')}}).toArray()`);
    if (infos) {
      return infos.filter(info => info.url);
    } else {
      console.log('no infos');
      return [];
    }
  }
}

module.exports = DonewsParser;