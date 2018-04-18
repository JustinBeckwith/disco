#!/usr/bin/env node
import {disco} from './';

const args = process.argv.slice(2);

switch (args.length) {
  case 0:
    download('data.json');
    break;
  case 1:
    download(args[0]);
    break;
  default:
    showUsage();
}

function showUsage() {
  console.error(`USAGE: disco data.json`);
  process.exit();
}

function download(exportPath: string) {
  return disco.download({exportPath})
      .then(r => {
        console.error('Download complete.');
      })
      .catch(e => {
        console.error('Error downloading discovery docs.');
        console.error(e);
      });
}
