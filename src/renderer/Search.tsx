import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  LinearProgress,
  Snackbar,
  TextField,
  Alert as MuiAlert,
} from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import useLocalStorageState from 'use-local-storage-state';
import styled from '@emotion/styled';
import { difference, pluck } from 'ramda';

import {
  SearchData,
  IpcMessageType,
  SearchValidationError,
  SearchResult,
  ResolvedParts,
} from '../types';
import ResultsTable from './ResultsTable';
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
  const { outgoing: outgoingSearchCancel } = useIpc<null>(
    IpcMessageType.SEARCH_CANCEL,
  );
  const { incoming: incomingSearchProgress } = useIpc<number>(
    IpcMessageType.SEARCH_PROGRESS,
  );
  const { incoming: incomingSearchResults } = useIpc<SearchResult>(
    IpcMessageType.SEARCH_RESULTS,
  );
  const { incoming: incomingSearchComplete } = useIpc<null>(
    IpcMessageType.SEARCH_COMPLETE,
  );
  const { incoming: incomingResolvedParts } = useIpc<ResolvedParts>(
    IpcMessageType.RESOLVED_PARTS,
  );
  const { incoming: incomingError } = useIpc<SearchValidationError>(
    IpcMessageType.SEARCH_VALIDATION_ERROR,
  );

  const [error, setError] = useState<SearchValidationError>({});
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
  const [warningMessage, setWarningMessage] = useState('');

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setWarningMessage('');
      setError({});
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
      const resolvedSearches: string[] = pluck('search', resolvedParts);
      const unresolvedSearches = difference(searches, resolvedSearches);
      if (unresolvedSearches.length > 0)
        setWarningMessage(`${unresolvedSearches.join(', ')} not found`);
      setData({ resolvedParts, searchResults: [] });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [searches, data, setData, incomingResolvedParts]);

  useEffect(() => {
    const subscription = incomingError.subscribe((errorMessage) => {
      setSearching(false);
      setError(errorMessage);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [incomingError]);

  useEffect(() => {
    outgoingSearchCancel.next(null);
    return () => {
      outgoingSearchCancel.next(null);
    };
  }, [outgoingSearchCancel]);

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') {
      return;
    }

    setWarningMessage('');
  };

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
          error={!!error.zip}
          label="Zip Code"
          type="string"
          value={zip}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setZip(event.target.value)
          }
          helperText={error.zip}
          required
        />
        <TextField
          error={!!error.radius}
          label="Radius"
          type="number"
          value={radius}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setRadius(event.target.value)
          }
          helperText={error.radius}
          required
        />
        <MuiChipsInput
          error={!!error.searches}
          sx={{ flex: 1 }}
          label="Search"
          size="medium"
          value={searches}
          onChange={setSearches}
          helperText={error.searches}
          required={searches.length === 0}
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
      <Snackbar
        open={!!warningMessage}
        autoHideDuration={6000}
        onClose={handleClose}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={handleClose}
          severity="warning"
          sx={{ width: '100%' }}
        >
          {warningMessage}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}
