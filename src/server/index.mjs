import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import zips from 'us-zips';

import searchParts from './search.mjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors({
  origin: 'http://localhost:3000',
}));

io.on('connection', (socket) => {
  console.log('connected');

  let controller;
  socket.on('search', async (searchOptions) => {
    if (controller) controller.abort();

    controller = new AbortController();
    const { signal } = controller;

    console.log('searchOptions', searchOptions);

    try {
      await searchParts({
        ...searchOptions,
        zip: parseInt(searchOptions.zip, 10),
        onPartsResolved: (parts) => {
          io.emit('resolvedParts', parts);
        },
        onSearchResult: (result) => {
          io.emit('searchResult', result);
        },
        onSearchProgress: (progress) => {
          io.emit('searchProgress', progress);
        },
        concurrency: 10,
        signal,
        location: zips[searchOptions.zip],
      });
    } catch (error) {
      // do something about it
    }

    socket.emit('searchComplete');
  });

  socket.on('cancelSearch', () => {
    if (controller) controller.abort();
    console.log('search cancelled');
  });

  socket.on('disconnect', () => {
    if (controller) controller.abort();
    console.log('user disconnected');
  });
});

server.listen(8080);
