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
    }
  }
}

module.exports = config;