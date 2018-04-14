const _ = require('lodash');
const Plugin = require('./plugin.js');
const Sentence = require('./sentence.js');
const Pronoun = require('./pronoun.js');
const nameGenders = require('./../data/nameGenders.js');
const abbreviations = require('./../data/abbreviations.js');

class Paragraph extends Plugin {
  constructor(string) {
    super(string);
    this.split();
  }

  reset(string) {
    this.input = string;
    this.current = string;
    this.split();
  }

  split() {
    let abbreviationList = [],
    abbreviationIndex = 0,
    abbreviationRegEx = new RegExp(`(${ abbreviations.join('|') })`, 'gi');
    let current = this.current.replace(abbreviationRegEx, (match, param) => {
      abbreviationList[abbreviationIndex] = match;
      let replacement = `[token-${ abbreviationIndex }]`;
      abbreviationIndex++;
      return replacement;
    });
    this.sentences = current
      .match(/[^.!?]+[.!?]+( |$)/g)
      .map(item => {
        item = item.trim()
          .replace(/\[token-([0-9]+)\]/g, (match, param) => {
            return abbreviationList[param];
          });
        return Sentence.instance(item);
      });
  }

  resolveCoreferences() {
    let ref = [];
    let lastReference = {
      male: null,
      female: null,
      unknown: null,
      plural: null
    };
    this.sentences = _.map(this.sentences, item => {
      this.tagged = _.map(item.tagged, item => {
        if(item.tags.current && item.tags.current.match(/^P/g)) {
          let pronoun = Pronoun.instance(item.word);
          let currLastReference = null;
          if(pronoun.getGender() && lastReference[pronoun.getGender()]) {
            currLastReference = lastReference[pronoun.getGender()];
          } else if(lastReference.unknown) {
            currLastReference = lastReference.unknown;
          }
          if(pronoun.getPerson() == 3 && currLastReference) {
            item.coreference = currLastReference;
          }
        } else if(item.tags.current && item.tags.current.match(/^NP/g)) {
          if(nameGenders[item.word.toLowerCase()]) {
            if(nameGenders[item.word.toLowerCase()].length == 2) {
              lastReference.unknown = item;
            } else {
              lastReference[nameGenders[item.word.toLowerCase()][0]] = item;
            }
          } else {
            lastReference.unknown = item;
          }
        }
        return item
      });
      return item;
    });
    return this;
  }

  getAssertions() {
    let assertions = [];
    _.each(this.sentences, item => {
      assertions.push([item.getSubject(), item.getMainVerb(), item.getPredicateTail()]);
    });
    return assertions;
  }
}

module.exports.instance = (string) => {
  return new Paragraph(string);
};
module.exports.model = Paragraph;
