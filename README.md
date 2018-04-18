# @justinbeckwith/disco

[![NPM Version][npm-image]][npm-url]
[![CircleCI][circle-image]][circle-url]
[![Dependency Status][david-image]][david-url]
[![devDependency Status][david-dev-image]][david-dev-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]
[![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]
[![style badge][gts-image]][gts-url]

Disco is a simple little app that downloads Google discovery docs.  It creates a JSON file that you can save locally, or use to do bigger better things.  Unless you work on Google client libraries, you probably don't need it.

## Installation

``` sh
npm install @justinbeckwith/disco
```

## Usage

### CLI

This will download the discovery JSON and all code fragments into a file called `data.json`:

```sh
$ disco
```

Or you can pick what to name it.  Whatever.

```sh
$ disco some-file.json
```

### Library

Guess what.  It's also a library!

``` js
const { disco } = require('@justinbeckwith/disco');
await disco.download({
  exportFile: 'some-file.json'
});
```

You can listen for a few events too:

```js
disco.on('schemaError', err => {
  console.error(`oh noes: ${err.message}`);
});
```

## License

[MIT](LICENSE)

[circle-image]: https://circleci.com/gh/JustinBeckwith/disco.svg?style=svg
[circle-url]: https://circleci.com/gh/JustinBeckwith/disco
[codecov-image]: https://codecov.io/gh/JustinBeckwith/disco/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/JustinBeckwith/disco
[david-image]: https://david-dm.org/JustinBeckwith/disco.svg
[david-url]: https://david-dm.org/JustinBeckwith/disco
[david-dev-image]: https://david-dm.org/JustinBeckwith/disco/dev-status.svg
[david-dev-url]: https://david-dm.org/JustinBeckwith/disco?type=dev
[gdevconsole]: https://console.developers.google.com
[greenkeeper-image]: https://badges.greenkeeper.io/JustinBeckwith/disco.svg
[greenkeeper-url]: https://greenkeeper.io/
[gts-image]: https://img.shields.io/badge/code%20style-Google%20%E2%98%82%EF%B8%8F-blue.svg
[gts-url]: https://www.npmjs.com/package/gts
[npm-image]: https://img.shields.io/npm/v/@justinbeckwith/disco.svg
[npm-url]: https://npmjs.org/package/@justinbeckwith/disco
[snyk-image]: https://snyk.io/test/github/JustinBeckwith/disco/badge.svg
[snyk-url]: https://snyk.io/test/github/JustinBeckwith/disco
