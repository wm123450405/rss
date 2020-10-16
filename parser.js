class Parser {
  constructor(url) {
    this.url = url;
  }
  get name() {
    return '';
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async parse(contains) {
    return [];
  }
  static page(url) {
    return new DefaultPageParser(url);
  }
}

class DefaultAjaxParser extends Parser {
  constructor(url) {
    super(url);
  }
  get name() {
    return this.url;
  }
  get type() {
    return Parser.Types.AJAX;
  }
  async parse(contains) {
    
  }
}

class DefaultPageParser extends Parser {
  constructor(url) {
    super(url);
  }
  get name() {
    return this.url;
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async parse(contains) {

  }
}

Parser.Types = {
  PAGE: 'PAGE',
  AJAX: 'AJAX',
  RSS: 'RSS',
  XML: 'XML'
}

module.exports = Parser;