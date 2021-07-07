const { EventEmitter } = require('events');
const Enumerable = require('linq-js');
const log = require('electron-log');
const config = require('./config');

const defaultWeight = 1;
const interest = (original, weight = 1) => original * (1 + 0.01 * (original >= 2 ? Math.sqrt(weight) : weight));
const uninterest = (original, weight = 1) => original * (1 - 0.01 * (original <= 0.5 ? weight * weight : weight));
const match = (original, weight) => original * weight;
const thresholds = config.hot.thresholds;

class Matcher extends EventEmitter {
  constructor(tags) {
    super();
    this.tags = tags;
  }
  interest(words, weight = 1) {
    for (let w of words) {
      let exists = this.tags.find(tag => tag.w === w);
      if (exists) {
        exists.p = interest(exists.p, weight);
      } else {
        this.tags.push({ w, p: interest(defaultWeight, weight) });
      }
    }
    this.emit('changed');
  }
  uninterest(words, weight = 1) {
    for (let w of words) {
      let exists = this.tags.find(tag => tag.w === w);
      if (exists) {
        exists.p = uninterest(exists.p, weight);
      } else {
        this.tags.push({ w, p: uninterest(defaultWeight, weight) });
      }
    }
    this.emit('changed');
  }
  match(info) {
    const result = Enumerable.from(info.tags)
      .where(({ weight }) => weight > 0)
      .where(({ word }) => this.tags.some(tag => word === tag.w))
      .reduce((seed, { word }) => match(seed, this.tags.find(tag => word === tag.w).p), 1);
    log.info(`${ info.title } | 评分为:${ result }`);
    return result >= thresholds.line;
  }
  includes(word) {
    return this.tags.some(tag => (tag.p <= thresholds.min || tag.p >= thresholds.max) && tag.w === word);
  }
  search() {
    return this.tags.filter(tag => tag.p > thresholds.search).map(tag => tag.w);
  }
  empty() {
    return this.tags.length === 0;
  }
}

module.exports = Matcher;