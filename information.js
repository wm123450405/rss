const nodejieba = require('nodejieba');
const path = require('path');
const log = require('electron-log');
const crypto = require('crypto');
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
    if (/^\d{1,2}:\d{2}$/ig.test(datetime)) return new Date(new Date().toLocaleDateString() + ' ' +  datetime + ':00').getTime();
    if (/^\d{1,2}[-/月]\d{1,2}日$/ig.test(datetime)) return new Date(new Date().getFullYear() + '/' + datetime.replace(/[-年月]/ig, '/').replace('日', '') + ' 00:00:00').getTime();
    if (/^\d{1,2}[-/月]\d{1,2}日? \d{1,2}:\d{2}$/ig.test(datetime)) return new Date(new Date().getFullYear() + '/' + datetime.replace(/[-年月]/ig, '/').replace('日', '') + ':00').getTime();
    if (/^(\d{2}|\d{4})[-/年]\d{1,2}[-/月]\d{1,2}日?$/ig.test(datetime)) return new Date(datetime.replace(/[-年月]/ig, '/').replace('日', '') + ' 00:00:00').getTime();
    if (/^(\d{2}|\d{4})[-/年]\d{1,2}[-/月]\d{1,2}日? \d{1,2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/[-年月]/ig, '/').replace('日', '') + ':00').getTime();
    if (/^(\d{2}|\d{4})[-/年]\d{1,2}[-/月]\d{1,2}日? \d{1,2}:\d{2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/[-年月]/ig, '/').replace('日', '')).getTime();
    if (/^\d+天前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('天前', '')) * 86400000;
    if (/^\d+小时前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('小时前', '')) * 3600000;
    if (/^\d+分钟前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('分钟前', '')) * 60000;
    if (/^\d+秒前$/ig.test(datetime)) return +Date.now() - parseInt(datetime.replace('秒前', '')) * 1000;
    if ('刚刚' === datetime) return +Date.now();

    let today = Math.floor(+Date.now() / 86400000) * 86400000;
    let yesterday = today - 86400000;
    let beforeYesterday = yesterday - 86400000;
    if ('今日' === datetime || '今天' === datetime) return today;
    if (/^今(日|天)\s*\d{1,2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/今(日|天)\s*/ig, new Date(today).toLocaleDateString() + ' ') + ':00').getTime();
    if (/^今(日|天)\s*\d{1,2}:\d{2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/今(日|天)\s*/ig, new Date(today).toLocaleDateString() + ' ')).getTime();
    if ('昨日' === datetime || '昨天' === datetime) return yesterday;
    if (/^昨(日|天)\s*\d{1,2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/昨(日|天)\s*/ig, new Date(yesterday).toLocaleDateString() + ' ') + ':00').getTime();
    if (/^昨(日|天)\s*\d{1,2}:\d{2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/昨(日|天)\s*/ig, new Date(yesterday).toLocaleDateString() + ' ')).getTime();
    if ('前日' === datetime || '前天' === datetime) return beforeYesterday;
    if (/^前(日|天)\s*\d{1,2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/前(日|天)\s*/ig, new Date(beforeYesterday).toLocaleDateString() + ' ') + ':00').getTime();
    if (/^前(日|天)\s*\d{1,2}:\d{2}:\d{2}$/ig.test(datetime)) return new Date(datetime.replace(/前(日|天)\s*/ig, new Date(beforeYesterday).toLocaleDateString() + ' ')).getTime();

    return 0;
  } else {
    return 0;
  }
}

class Information {
  constructor(url, title, summary, image, datetime, simhash = 0) {
    this.url = url;
    this.title = title;
    this.summary = summary;
    this.image = image;
    this.datetime = formatDateTime(datetime);
    if (!this.datetime && datetime) log.warn('错误的时间格式:' + datetime);
    this.tags = this.initTags();
    this.simhash = typeof simhash !== 'string' ? Information.simhash(this) : simhash;
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
    return new Information(db.u, db.t, db.s, db.i, db.m, db.h);
  }
  static to(information) {
    return {
      u: information.url,
      t: information.title,
      s: information.summary,
      i: information.image,
      m: information.datetime
      // h: information.simhash
    }
  }
  static simhash(info, size = config.similar.hash) {
    // let v = 0xFFFFFFFF.toString(2).split('').map(v => 0);
    // for (let i = 0; i < info.tags.length; i++) {
    //   let tag = info.tags[i];
    //   let h = Information.hash(tag.word).toString(2).split('').map(v => (v === '0' ? -1 : 1) * (Math.round((tag.weight || 0) * info.tags.length) || 1));
    //   for (let j = v.length - 1, k = h.length - 1; j >= 0 && k >= 0; j--, k--) {
    //     v[j] += h[k];
    //   }
    // }
    // let result = 0;
    // for (let i = 0; i < v.length; i++) {
    //   result |= (v[i] > 0 ? 1 : 0) << (v.length - i - 1);
    // }
    // if (result < 0) {
    //   log.error(info.title, v, result);
    // }
    // return result;
    let v = new Array(size * 2).fill(false).map(() => [0, 0, 0, 0]);
    for (let i = 0; i < info.tags.length; i++) {
      let tag = info.tags[i];
      let hash = Information.hash(tag.word, size);
      let weight = Math.round(Math.sqrt(tag.weight)) || 1;
      for (let j = 0; j < size * 2; j++) {
        for (let k = 0; k < 4; k++) {
          v[j][k] += ((hash[j] >> (3 - k)) & 0x01) ? weight : -weight;
        }
      }
    }
    // log.debug(info.title, v);
    for (let j = 0; j < size * 2; j++) {
      let n = 0;
      for (let k = 0; k < 4; k++) {
        n |= v[j][k] > 0 ? 1 << (3 - k) : 0;
      }
      v[j] = n.toString(16);
    }
    // log.debug(info.title, v);
    return v.join('');
  }
  static hash(str, size = config.similar.hash) {
    // let h = 0x7FFFFFFF;
    // for (let i = 0; i < str.length; i++) {
    //   h ^= str.charCodeAt(i) << (i * 7 % 16);
    // }
    // return h;
    return crypto.pbkdf2Sync(str, '', 1, size, 'sha512').toString('hex').split('').map(v => Number.parseInt(v, 16));
  }
  static distance(x, y) {
    let length = Math.min(x.length, y.length);
    let maxLength = Math.max(x.length, y.length);
    let distance = 0;
    for (let s = 0, e = Math.min(4, length); s < length; s += 4, e = Math.min(e + 4, length)) {
      distance += Information.hammingDistance(Number.parseInt(x.substring(s, e), 16), Number.parseInt(y.substring(s, e), 16));
    }
    return distance + (maxLength - length) * 4;
  }
  static hammingDistance(x, y) {
    let s = x ^ y, ret = 0;
    while (s) {
        s &= s - 1;
        ret++;
    }
    return ret;
  }
  static db = false;
  static async initStorage(app) {
    Information.db = await Db.create(app, 'informations', [['m', 1], 't', 's', { key: 'u', options: { unique: true } }, 'i'])
  }
  static async add(information) {
    return (await Information.addAll([ information ])).length > 0;
  }
  static async addAll(informations) {
    let result = [];
    try {
      let olds = (await Information.db.find({
        m: { $gte: +Date.now() - 86400000 }
      })).map(Information.from);

      for (let information of informations) {
        if (await Information.db.findOne({ u: information.url })) {
          continue;
        }
        await Information.db.insert(Information.to(information));
        for (let old of olds) {
          let d = Information.distance(old.simhash, information.simhash);
          if (d <= Math.max(config.similar.hash * 4 / Math.ceil(Math.min(old.title.length / titleWeightSplit + (old.summary || '').length / summaryWeightSplit, information.title.length / titleWeightSplit + (information.summary || '').length / summaryWeightSplit) + 1), config.similar.warn)) {
            log.debug(`对比新闻相似度: ${information.title} ${information.summary || ''} # ${ information.url } # <${ information.simhash }> | ${old.title} ${old.summary || ''} # ${ old.url } # <${ old.simhash }> | 相似度: ${ d }`);
          }
        }
        let near = Enumerable.firstOrDefault(olds, false, old => (Information.distance(old.simhash, information.simhash) <= Math.max(config.similar.hash * 4 / Math.ceil(Math.min(old.title.length / titleWeightSplit + (old.summary || '').length / summaryWeightSplit, information.title.length / titleWeightSplit + (information.summary || '').length / summaryWeightSplit) + 1) * config.similar.truly / config.similar.warn, config.similar.truly)));
        if (near) {
          log.info(`出现相似新闻: ${information.title} <${ information.simhash }> | ${near.title} <${ near.simhash }>`);
          let index = result.indexOf(near);
          if (index !== -1) {
            if (near.title.length + (near.summary || '').length < information.title.length + (information.summary || '').length) {
              //替换为内容更多的新闻
              result.splice(index, 1, information);
            }
          }
        } else {
          result.push(information);
        }
        olds.push(information);
      }
      return result;
    } catch(e) {
      log.error(e);
      return result;
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