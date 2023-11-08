import zips from 'us-zips';
import { ipcMain } from 'electron';
import { isEmpty } from 'ramda';

import searchParts from './search';
import { IpcMessageType, SearchValidationError } from '../types';

export default function setupEvents() {
  let controller: AbortController;

  ipcMain.on('search', async (event, searchOptions) => {
    if (controller) controller.abort();

    controller = new AbortController();
    const { signal } = controller;

    console.log('searchOptions', searchOptions);

    const validationError: SearchValidationError = {};
    if (!zips[searchOptions.zip]) {
      validationError.zip = 'Invalid zip code';
    }
    if (searchOptions.radius < 1 || searchOptions.radius > 5000) {
      validationError.radius = 'Must be between 1 and 5000';
    }
    if (searchOptions.searches.length === 0) {
      validationError.searches = 'Must have at least one search';
    }
    if (!isEmpty(validationError)) {
      event.reply(IpcMessageType.SEARCH_VALIDATION_ERROR, validationError);
      return;
    }

    try {
      await searchParts({
        ...searchOptions,
        onPartsResolved: (parts) => {
          event.reply(IpcMessageType.RESOLVED_PARTS, parts);
        },
        onSearchResult: (result) => {
          event.reply(IpcMessageType.SEARCH_RESULTS, result);
        },
        onSearchProgress: (progress) => {
          event.reply(IpcMessageType.SEARCH_PROGRESS, progress);
        },
        concurrency: 10,
        signal,
        location: zips[searchOptions.zip],
      });
    } catch (error) {
      // TODO: do something about it
    }

    event.reply(IpcMessageType.SEARCH_COMPLETE);
  });

  ipcMain.on('searchCancel', () => {
    if (controller) controller.abort();
    console.log('search cancelled');
  });

  ipcMain.on('disconnect', () => {
    if (controller) controller.abort();
    console.log('search cancelled');
  });
}
