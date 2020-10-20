const defaultWeight = 100;
const interest = (original, weight = 1) => Math.floor(original * (1 + 0.1 * weight));
const uninterest = (original, weight = 1) => Math.floor(original * (1 - 0.1 * weight));
const thresholds = { max: 120, min: 50, line: 85 };

class Matcher {
  constructor(tags) {
    this.tags = tags;
  }
  interest(words, weight = 1) {
    for (let word of words) {
      let exists = this.tags.find(tag => tag.word === word);
      if (exists) {
        exists.weight = interest(exists.weight, weight);
      } else {
        this.tags.push({ word, weight: defaultWeight });
      }
    }
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
  }
  match(info) {
    return info.tags.filter(({ weight }) => weight > 0).some(({ word }) => this.tags.some(tag => tag.weight >= thresholds.line && word === tag.word));
  }
  includes(word) {
    return this.tags.some(tag => (tag.weight <= thresholds.min || tag.weight >= thresholds.max) && tag.word === word);
  }
}

module.exports = Matcher;