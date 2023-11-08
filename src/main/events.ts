import zips from 'us-zips';
import { ipcMain } from 'electron';

import searchParts from './search';
import { IpcMessageType } from '../types';

export default function setupEvents() {
  let controller: AbortController;

  ipcMain.on('search', async (event, searchOptions) => {
    if (controller) controller.abort();

    controller = new AbortController();
    const { signal } = controller;

    console.log('searchOptions', searchOptions);

    try {
      await searchParts({
        ...searchOptions,
        zip: parseInt(searchOptions.zip, 10),
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
