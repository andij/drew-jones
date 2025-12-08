# drew-jones.com

Personal website for Drew Jones - Creative developer and systems thinker.

## Overview

This is a simple, elegant personal landing page built with [Eleventy](https://www.11ty.dev/), featuring a collection of useful links and tools.

## Tech Stack

- **Eleventy (11ty)** - Static site generator
- **Nunjucks** - Templating engine
- **Lucide Icons** - Icon library

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Development

Start the development server with live reload:

```bash
npm start
```

The site will be available at `http://localhost:8080`

### Build

Build the site for production:

```bash
npm run build
```

The generated site will be in the `_site` directory.

### Other Commands

- `npm run clean` - Remove the `_site` directory
- `npm run clear` - Remove both `_site` and `node_modules` directories

## Project Structure

```
drew-jones/
├── src/
│   ├── index.njk          # Main page template
│   ├── _data/
│   │   └── links.json     # Link data
│   ├── _includes/
│   │   └── base.njk       # Base layout template
│   ├── assets/
│   │   └── styles.css     # Styles
│   └── img/               # Images
├── _site/                 # Generated site (not tracked)
├── package.json
└── README.md
```

## Customization

### Adding Links

Edit `src/_data/links.json` to add or modify links. Each link requires:

- `title` - Display name
- `url` - Link destination
- `description` - Tooltip text
- `icon` - Lucide icon name

### Styling

Modify `src/assets/styles.css` to customize the appearance.

## License

ISC

## Author

Drew Jones [@andij](https://github.com/andij)
