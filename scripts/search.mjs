#!/usr/bin/env node
import zips from 'us-zips';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs/promises';
import searchParts from '../src/server/search.mjs';

const concurrency = 10;
const maxItems = 1000000;

const { argv } = yargs(hideBin(process.argv))
  .parserConfiguration({
    'duplicate-arguments-array': false,
  })
  .option('search', {
    type: 'array',
    demandOption: true,
  })
  .option('radius', {
    type: 'number',
    default: 100,
  })
  .option('zip', {
    type: 'number',
    demandOption: true,
  })
  .middleware((opts) => {
    if (!zips[opts.zip]) {
      throw new Error(`Invalid zip code: ${opts.zip}`);
    }
    return { ...opts, location: zips[opts.zip] };
  });

(async () => {
  const result = await searchParts({
    searches: argv.search,
    concurrency,
    maxDealerships: maxItems,
    radius: argv.radius,
    location: argv.location,
  });

  await fs.writeFile('public/results.json', JSON.stringify(result, null, 2));
})();
