module.exports = function(eleventyConfig) {

  eleventyConfig.setBrowserSyncConfig({
    // https://www.browsersync.io/docs/options
    codeSync: false
  });

  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addPassthroughCopy({ "src/img/avatar.*": "/" });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      layouts: "_layouts"
    }
  };

};
