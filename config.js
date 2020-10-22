const config = {
  path: {
    dir: 'user',
    hot: 'hot.json',
    parser: 'parser.json'
  },
  hot: {
    size: 50,
    main: 10,
    weight: {
      interset: 2.5,
      uninterset: {
        main: 1,
        other: 0.2
      }
    }
  }
}

module.exports = config;