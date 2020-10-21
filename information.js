const nodejieba = require('nodejieba');
const Enumerable = require('linq-js');
const config = require('./config');

const informations = [];

const titleWeightSplit = 6;
const summaryWeightSplit = 18;
const weightMerge = (original, weight, summary = false) => original + (summary ? weight * 0.2 : weight);
const ignoreWords = [ 'pro', 'mini', 'max' ]
const ignoreTags = [ 't', 'm', 'q', 'r', 'p', 'c', 'u', 'w', 'a', 'ad', 'd', 'TIME' ]; //时间副词
const ignoreTag = ({ tag, word }) => ignoreTags.includes(tag) || ignoreWords.includes(word.toLowerCase()) || word.length < 2 || /^[\x00-\xFF]*\d+[\x00-\xFF]*$/ig.test(word);

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
      if (!ignoreTag(tag)) {
        tags.push({
          ...tag,
          weight: titleWeightTags.filter(t => t.word === tag.word).map(t => t.weight)[0] || 0
        });
      }
    }
    if (this.summary) {
      let summaryWeightTags = this.summary.length < summaryWeightSplit ? [] : nodejieba.extract(this.summary, Math.floor(this.summary.length / summaryWeightSplit));
      for (let tag of nodejieba.tag(this.summary)) {
        if (!ignoreTag(tag)) {
          let existsTag = tags.find(t => t.word === tag.word && t.tag === tag.tag);
          let weightTag = summaryWeightTags.find(t => t.word === tag.word);
          if (existsTag) {
            existsTag.weight = weightMerge(existsTag.weight, weightTag ? weightTag.weight : 0, true);
          } else {
            existsTag = tag;
            existsTag.weight = weightMerge(0, weightTag ? weightTag.weight : 0, true);
            tags.push(existsTag);
          }
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
      .where(({ word, tag }) => !ignoreTag({ word, tag }) && !ignores.includes(word.toLowerCase()))
      .groupBy(({ word, tag }) => ({ word, tag }), tag => tag.weight, ({ word, tag }, grouping) => ({ word, tag, weight: grouping.reduce(weightMerge, 0) }), (one, other) => one.word === other.word && one.tag === other.tag)
      .orderByDescending(tag => tag.weight)
      .take(config.hot.size)
      .toArray();
  }
}

module.exports = Information;