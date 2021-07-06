const { EventEmitter } = require('events');
const Enumerable = require('linq-js');

const defaultWeight = 100;
const interest = (original, weight = 1) => original * (1 + 0.1 * weight);
const uninterest = (original, weight = 1) => original * (1 - 0.1 * weight);
const match = (original, weight) => original * weight;
const thresholds = { max: 120, min: 50, line: 105, search: 125 };

class Matcher extends EventEmitter {
  constructor(tags) {
    super();
    this.tags = tags;
  }
  interest(words, weight = 1) {
    for (let word of words) {
      let exists = this.tags.find(tag => tag.word === word);
      if (exists) {
        exists.weight = interest(exists.weight, weight);
      } else {
        this.tags.push({ word, weight: interest(defaultWeight, weight) });
      }
    }
    this.emit('changed');
  }
  uninterest(words, weight = 1) {
    for (let word of words) {
      let exists = this.tags.find(tag => tag.word === word);
      if (exists) {
        exists.weight = uninterest(exists.weight, weight);
      } else {
        this.tags.push({ word, weight: uninterest(defaultWeight, weight) });
      }
    }
    this.emit('changed');
  }
  match(info) {
    const result = Enumerable.from(info.tags)
      .where(({ weight }) => weight > 0)
      .where(({ word }) => this.tags.some(tag => word === tag.word))
      .reduce((seed, { word }) => match(seed, this.tags.find(tag => word === tag.word).weight / 100), 1) * 100;
    return result >= thresholds.line;
  }
  includes(word) {
    return this.tags.some(tag => (tag.weight <= thresholds.min || tag.weight >= thresholds.max) && tag.word === word);
  }
  search() {
    return this.tags.filter(tag => tag.weight > thresholds.line).map(tag => tag.word);
  }
  empty() {
    return this.tags.length === 0;
  }
}

module.exports = Matcher;