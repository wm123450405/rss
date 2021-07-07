const config = {
  path: {
    dir: 'user',
    hot: 'hot.json',
    parser: 'parser.json'
  },
  hot: {
    size: 80,
    main: 12,
    weight: {
      interset: 25,
      uninterset: {
        main: 10,
        other: 2
      }
    },
    thresholds: {
      max: 1.20,
      min: 0.80,
      line: 1.05,
      search: 1.25
    }
  }
}

module.exports = config;