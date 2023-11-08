import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, LinearProgress, TextField } from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import useLocalStorageState from 'use-local-storage-state';
import styled from '@emotion/styled';

import ResultsTable from './ResultsTable';
import { SearchData, IpcMessageType } from '../types';
import useIpc from './useIpc';

const Form = styled.form`
  padding: 12px 6px;
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  gap: 9px;
`;

const InputAlignedButton = styled(Button)`
  height: 56px;
`;

export default function Search() {
  const { outgoing: outgoingSearch } = useIpc(IpcMessageType.SEARCH);
  const { outgoing: outgoingSearchCancel } = useIpc(
    IpcMessageType.SEARCH_CANCEL,
  );
  const { incoming: incomingSearchProgress } = useIpc(
    IpcMessageType.SEARCH_PROGRESS,
  );
  const { incoming: incomingSearchResults } = useIpc(
    IpcMessageType.SEARCH_RESULTS,
  );
  const { incoming: incomingSearchComplete } = useIpc(
    IpcMessageType.SEARCH_COMPLETE,
  );
  const { incoming: incomingResolvedParts } = useIpc(
    IpcMessageType.RESOLVED_PARTS,
  );

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
      outgoingSearch.next({
        searches,
        zip,
        radius,
      });
    },
    [outgoingSearch, searches, radius, zip, setData],
  );

  const onCancel = useCallback(() => {
    outgoingSearchCancel.next(null);
  }, [outgoingSearchCancel]);

  useEffect(() => {
    const subscription = incomingSearchProgress.subscribe((currentProgress) => {
      setProgress(currentProgress);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [incomingSearchProgress]);

  useEffect(() => {
    const subscription = incomingSearchResults.subscribe((searchResult) => {
      setData({
        ...data,
        searchResults: [...data.searchResults, searchResult],
      });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [data, setData, incomingSearchResults]);

  useEffect(() => {
    const subscription = incomingSearchComplete.subscribe(() => {
      setSearching(false);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [incomingSearchComplete]);

  useEffect(() => {
    const subscription = incomingResolvedParts.subscribe((resolvedParts) => {
      setData({ resolvedParts, searchResults: [] });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [data, setData, incomingResolvedParts]);

  useEffect(() => {
    outgoingSearchCancel.next(null);
    return () => {
      outgoingSearchCancel.next(null);
    };
  }, [outgoingSearchCancel]);

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
          <InputAlignedButton
            color="secondary"
            variant="outlined"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </InputAlignedButton>
        ) : (
          <InputAlignedButton color="primary" variant="contained" type="submit">
            Search
          </InputAlignedButton>
        )}
      </Form>
      {searching && (
        <LinearProgress variant="determinate" value={progress * 100} />
      )}
      {data.resolvedParts.length > 0 && <ResultsTable data={data} />}
    </Box>
  );
}
