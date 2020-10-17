const Information = require("../information");
const Parser = require("../parser");

class DonewsParser extends Parser {
  constructor() {
    super('https://www.donews.com/')
  }
  get name() {
    return 'cnbeta';
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async parse(page) {
    let infos = await page.evaluate(`$('.left a.news-item').map(function() {return {title:$(this).find('.title').text(), summary:$(this).find('desc').text(), image:$(this).find('img').attr('src'), url:$(this).attr('href')}}).toArray()`);
    if (infos) {
      return infos.filter(info => info.url).map(info => new Information(info.url, info.title, info.summary, info.image));
    } else {
      console.log('no infos');
      return [];
    }
  }
}

module.exports = DonewsParser;