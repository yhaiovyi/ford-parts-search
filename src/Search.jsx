import React, {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { filter } from 'rxjs';
import {
  Box, Button, LinearProgress, TextField,
} from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import useLocalStorageState from 'use-local-storage-state';
import styled from '@emotion/styled';

import ResultsTable from './ResultsTable';
import { WebsocketContext } from './WebsocketProvider';

const Form = styled.form`
  padding: 12px 6px;
  display: flex;
  flex-direction: row;
  gap: 9px;
`;

export default function Search() {
  const { outgoing, incoming } = useContext(WebsocketContext);

  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searches, setSearches] = useLocalStorageState('searches', { defaultValue: [] });
  const [zip, setZip] = useLocalStorageState('zip', { defaultValue: '' });
  const [radius, setRadius] = useLocalStorageState('radius', { defaultValue: '20' });
  const [data, setData] = useLocalStorageState('data', { defaultValue: null });

  const onSubmit = useCallback((event) => {
    event.preventDefault();
    setSearching(true);
    setProgress(0);
    setData(null);
    outgoing.next({
      type: 'search',
      data: {
        searches,
        zip,
        radius,
      },
    });
  }, [outgoing, searches, radius, zip, setData]);

  const onCancel = useCallback(() => {
    outgoing.next({ type: 'cancelSearch' });
  }, [outgoing]);

  useEffect(() => {
    const partsSubscription = incoming
      .pipe(filter(({ type }) => type === 'resolvedParts' && searching))
      .subscribe(({ data: resolvedParts }) => {
        console.log(resolvedParts);
        setData({ resolvedParts, searchResults: [] });
      });

    const resultsSubscription = incoming
      .pipe(filter(({ type }) => type === 'searchResult' && searching))
      .subscribe(({ data: searchResult }) => {
        setData({ ...data, searchResults: [...data.searchResults, searchResult] });
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
        <TextField label="Zip Code" type="string" value={zip} onInput={(event) => setZip(event.target.value)} required />
        <TextField label="Radius" type="number" value={radius} onInput={(event) => setRadius(event.target.value)} required />
        <MuiChipsInput sx={{ flex: 1 }} label="Search" size="medium" value={searches} onChange={setSearches} />
        {
          searching
            ? <Button color="secondary" variant="outlined" type="button" onClick={onCancel}>Cancel</Button>
            : <Button color="primary" variant="contained" type="submit">Search</Button>
        }
      </Form>
      { searching && <LinearProgress variant="determinate" value={progress * 100} /> }
      {data && <ResultsTable data={data} />}
    </Box>
  );
}
