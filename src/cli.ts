#!/usr/bin/env node
import {disco, Schemas, SchemaError} from './';
import * as ProgressBar from 'progress';
import * as ora from 'ora';

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
  const spinner = ora('Downloading discovery docs').start();
  const errors = new Array<SchemaError>();
  let total = 0;
  let current = 0;
  disco
      .on('discoveryDownloaded',
          (api: Schemas) => {
            spinner.text =
                'Discovery downloaded! Starting to download schemas...';
            total = api.items.length;
          })
      .on('schemaError',
          data => {
            errors.push(data);
            current++;
          })
      .on('schemaDone',
          schema => {
            spinner.text =
                `[${current}/${total}] Schema complete: ${schema.name}`;
            current++;
          })
      .on('fragmentStart', path => {
        spinner.text = `[${current}/${total}] fetching fragment: ${path}`;
      });

  return disco.download({exportPath})
      .then(r => {
        spinner.stop();
        console.error('Download complete!');
        errors.forEach(e => {
          console.error(
              `Error loading schema '${e.schema.name}: ${e.err.message}`);
        });
      })
      .catch(e => {
        console.error('Error downloading discovery docs.');
        console.error(e);
        process.exit(-1);
      });
}
