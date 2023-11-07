import React, { useCallback, useContext, useEffect, useState } from 'react';
import { filter } from 'rxjs';
import { Box, Button, LinearProgress, TextField } from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import useLocalStorageState from 'use-local-storage-state';
import styled from '@emotion/styled';

import ResultsTable from './ResultsTable';
import { WebsocketContext } from './WebsocketProvider';
import { ResolvedParts, SearchData, WebSocketMessage } from '../types';

const Form = styled.form`
  padding: 12px 6px;
  display: flex;
  flex-direction: row;
  gap: 9px;
`;

export default function Search() {
  const { outgoing, incoming } = useContext(WebsocketContext);

  const [searching, setSearching] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [searches, setSearches] = useLocalStorageState<string[]>('searches', {
    defaultValue: [],
  });
  const [zip, setZip] = useLocalStorageState<string>('zip', {
    defaultValue: '',
  });
  const [radius, setRadius] = useLocalStorageState<string>('radius', {
    defaultValue: '20',
  });
  const [data, setData] = useLocalStorageState<SearchData>('data', {
    defaultValue: {
      resolvedParts: [],
      searchResults: [],
    },
  });

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSearching(true);
      setProgress(0);
      setData({
        resolvedParts: [],
        searchResults: [],
      });
      outgoing.next({
        type: 'search',
        data: {
          searches,
          zip,
          radius,
        },
      });
    },
    [outgoing, searches, radius, zip, setData],
  );

  const onCancel = useCallback(() => {
    outgoing.next({ type: 'cancelSearch', data: null });
  }, [outgoing]);

  useEffect(() => {
    const partsSubscription = incoming
      .pipe<WebSocketMessage<ResolvedParts>>(
        filter(({ type }) => type === 'resolvedParts' && searching),
      )
      .subscribe(({ data: resolvedParts }) => {
        setData({ resolvedParts, searchResults: [] });
      });

    const resultsSubscription = incoming
      .pipe(filter(({ type }) => type === 'searchResult' && searching))
      .subscribe(({ data: searchResult }) => {
        setData({
          ...data,
          searchResults: [...data.searchResults, searchResult],
        });
      });

    const searchCompleteSubscription = incoming
      .pipe(filter(({ type }) => type === 'searchComplete' && searching))
      .subscribe(() => {
        setSearching(false);
      });

    const searchProgressSubscription = incoming
      .pipe(filter(({ type }) => type === 'searchProgress' && searching))
      .subscribe(({ data: currentProgress }) => {
        setProgress(currentProgress);
      });

    return () => {
      partsSubscription.unsubscribe();
      resultsSubscription.unsubscribe();
      searchCompleteSubscription.unsubscribe();
      searchProgressSubscription.unsubscribe();
    };
  });

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Form onSubmit={onSubmit}>
        <TextField
          label="Zip Code"
          type="string"
          value={zip}
          onInput={(event: React.ChangeEvent<HTMLInputElement>) =>
            setZip(event.target.value)
          }
          required
        />
        <TextField
          label="Radius"
          type="number"
          value={radius}
          onInput={(event: React.ChangeEvent<HTMLInputElement>) =>
            setRadius(event.target.value)
          }
          required
        />
        <MuiChipsInput
          sx={{ flex: 1 }}
          label="Search"
          size="medium"
          value={searches}
          onChange={setSearches}
        />
        {searching ? (
          <Button
            color="secondary"
            variant="outlined"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : (
          <Button color="primary" variant="contained" type="submit">
            Search
          </Button>
        )}
      </Form>
      {searching && (
        <LinearProgress variant="determinate" value={progress * 100} />
      )}
      {data.resolvedParts.length > 0 && <ResultsTable data={data} />}
    </Box>
  );
}
