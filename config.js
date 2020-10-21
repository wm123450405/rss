const config = {
  path: {
    dir: 'user',
    hot: 'hot.json'
  },
  hot: {
    size: 50,
    main: 10,
    weight: {
      interset: 2,
      uninterset: {
        main: 1,
        other: 0.2
      }
    }
  }
}

module.exports = config;