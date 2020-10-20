const nodejieba = require('nodejieba');
const Enumerable = require('linq-js');

const informations = [];

const titleWeightSplit = 6;
const summaryWeightSplit = 12;
const weightMerge = (original, weight) => original + weight;
const ignoreWords = [ 'pro', 'mini', 'max' ]

class Information {
  constructor(url, title, summary, image) {
    this.url = url;
    this.title = title;
    this.summary = summary;
    this.image = image;
    this.tags = this.initTags();
  }
  initTags() {
    let tags = [];
    let titleWeightTags = this.title.length < titleWeightSplit ? [] : nodejieba.extract(this.title, Math.floor(this.title.length / titleWeightSplit));
    for (let tag of nodejieba.tag(this.title)) {
      tags.push({
        ...tag,
        weight: titleWeightTags.filter(t => t.word === tag.word).map(t => t.weight)[0] || 0
      });
    }
    if (this.summary) {
      let summaryWeightTags = this.summary.length < summaryWeightSplit ? [] : nodejieba.extract(this.summary, Math.floor(this.summary.length / summaryWeightSplit));
      for (let tag of nodejieba.tag(this.summary)) {
        let existsTag = tags.find(t => t.word === tag.word);
        let weightTag = summaryWeightTags.find(t => t.word === tag.word);
        if (existsTag) {
          existsTag.weight = weightMerge(existsTag.weight, weightTag ? weightTag.weight : 0);
        } else {
          existsTag = tag;
          existsTag.weight = weightMerge(0, weightTag ? weightTag.weight : 0);
          tags.push(existsTag);
        }
      }
    }
    return tags;
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
  static hotTags(ignores) {
    ignores = ignores || [];
    return Enumerable.from(informations)
      .selectMany(info => info.tags)
      .where(tag => tag.word.length >= 2 && !/^\d+$/ig.test(tag.word) && !ignoreWords.includes(tag.word.toLowerCase()) && !ignores.includes(tag.word.toLowerCase()))
      .groupBy(tag => tag.word, tag => tag.weight, (key, grouping) => ({ title: key, weight: grouping.sum() }))
      .orderByDescending(tag => tag.weight)
      .take(50)
      .toArray();
  }
}

module.exports = Information;