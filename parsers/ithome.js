const Information = require("../information");
const Parser = require("../parser");

class IthomeParser extends Parser {
  constructor() {
    super('https://www.ithome.com/')
  }
  get name() {
    return 'cnbeta';
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async parse(page) {
    let infos = await page.evaluate(`$('ul.nl li').map(function() {return {title: $(this).children('a').text(), url: $(this).children('a').attr('href')}}).toArray()`);
    if (infos) {
      return infos.filter(info => info.url).map(info => new Information(info.url, info.title, info.summary, info.image));
    } else {
      console.log('no infos');
      return [];
    }
  }
}

module.exports = IthomeParser;