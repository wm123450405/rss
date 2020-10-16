const informations = [];

class Information {
  constructor(url, title, summary, image) {
    this.url = url;
    this.title = title;
    this.summary = summary;
    this.image = image;
  }
  static add(information) {
    if (!informations.some(i => i.url === information.url)) {
      informations.push(information);
      return true;
    } else {
      return false;
    }
  }
  static restore() {

  }
  static save() {

  }
}

module.exports = Information;