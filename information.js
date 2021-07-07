const nodejieba = require('nodejieba');
const path = require('path');
const log = require('electron-log');
const Enumerable = require('linq-js');
const config = require('./config');
const Db = require('./db');

const titleWeightSplit = 6;
const summaryWeightSplit = 18;
const weightMerge = (original, weight, summary = false) => original + (summary ? weight * 0.2 : weight);
const ignoreWords = [ 'pro', 'mini', 'max' ]
const ignoreTags = [ 't', 'm', 'q', 'r', 'p', 'c', 'u', 'w', 'a', 'ad', 'd', 'TIME' ]; //时间副词
const ignoreTag = ({ tag, word }) => ignoreTags.includes(tag) || ignoreWords.includes(word.toLowerCase()) || word.length < 2 || /^[\x00-\xFF]*\d+[\x00-\xFF]*$/ig.test(word);

const DEFAULT_DICT = nodejieba.DEFAULT_DICT.replace(/app\.asar(\\|\/)/ig, 'app.asar.unpacked$1');
const DEFAULT_HMM_DICT = nodejieba.DEFAULT_HMM_DICT.replace(/app\.asar(\\|\/)/ig, 'app.asar.unpacked$1');
const DEFAULT_USER_DICT = nodejieba.DEFAULT_USER_DICT.replace(/app\.asar(\\|\/)/ig, 'app.asar.unpacked$1');
const DEFAULT_IDF_DICT = nodejieba.DEFAULT_IDF_DICT.replace(/app\.asar(\\|\/)/ig, 'app.asar.unpacked$1');
const DEFAULT_STOP_WORD_DICT = nodejieba.DEFAULT_STOP_WORD_DICT.replace(/app\.asar(\\|\/)/ig, 'app.asar.unpacked$1');

nodejieba.load({
  dict: DEFAULT_DICT,
  hmmDict: DEFAULT_HMM_DICT,
  userDict: DEFAULT_USER_DICT,
  idfDict: DEFAULT_IDF_DICT,
  stopWordDict: DEFAULT_STOP_WORD_DICT
})

const formatDateTime = datetime => {
  if (datetime) {
    if (Number.isInteger(datetime)) return datetime;
    else if (/^\d{1,2}:\d{2}$/ig.test(datetime)) return new Date(new Date().toDateString() + ' ' +  datetime + ':00').getTime();
    else if (/^\d{1,2}[-/月]\d{1,2}日? \d{1,2}:\d{2}$/ig.test(datetime)) return new Date(new Date().getFullYear() + '/' + datetime.replace(/[-年月]/ig, '/').replace('日', '') + ':00').getTime();
    else if (/^(\d{2}|\d{4})[-/年]\d{1,2}[-/月]\d{1,2}日?$/ig.test(datetime)) return new Date(datetime.replace(/[-年月]/ig, '/').replace('日', '') + ' 00:00:00').getTime();
    else if (/^(\d{2}|\d{4})[-/年]\d{1,2}[-/月]\d{1,2}日? \d{1,2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/[-年月]/ig, '/').replace('日', '') + ':00').getTime();
    else if (/^(\d{2}|\d{4})[-/年]\d{1,2}[-/月]\d{1,2}日? \d{1,2}:\d{2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/[-年月]/ig, '/').replace('日', '')).getTime();
    else if (/^\d+天前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('天前', '')) * 86400000;
    else if (/^\d+小时前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('小时前', '')) * 3600000;
    else if (/^\d+分钟前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('分钟前', '')) * 60000;
    else if (/^\d+秒前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('秒前', '')) * 1000;
    else if ('刚刚' === datetime) return +Date.now();
    else if ('昨天' === datetime) return +Date.now() - 86400000;
    else if ('前天' === datetime) return +Date.now() - 86400000;
    else return 0;
  } else {
    return 0;
  }
}

class Information {
  constructor(url, title, summary, image, datetime) {
    this.url = url;
    this.title = title;
    this.summary = summary;
    this.image = image;
    this.datetime = formatDateTime(datetime);
    if (!this.datetime && datetime) log.warn('错误的时间格式:' + datetime);
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
  static from(db) {
    return new Information(db.u, db.t, db.s, db.i, db.m);
  }
  static to(information) {
    return {
      u: information.url,
      t: information.title,
      s: information.summary,
      i: information.image,
      m: information.datetime
    }
  }
  static db = false;
  static async initStorage() {
    Information.db = await Db.create('informations', [['m', 1], 't', 's', { key: 'u', options: { unique: true } }, 'i'])
  }
  static async add(information) {
    if (await Information.db.findOne({ u: information.url })) {
      return false;
    }
    try {
      await Information.db.insert(Information.to(information));
      return true;
    } catch(e) {
      return false;
    }
  }
  static async hotTags(ignores, latest = +Date.now() - 86400000) {
    ignores = ignores || [];
    let informations = (await Information.db.find({
      m: { $gte: latest }
    })).map(Information.from);
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