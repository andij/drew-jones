module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/chess/*.js");
  eleventyConfig.addPassthroughCopy("src/chess/*.css");
  eleventyConfig.addPassthroughCopy("src/chess/assets");

  return {
    dir: {
      input: "src",
    },
  };
};
