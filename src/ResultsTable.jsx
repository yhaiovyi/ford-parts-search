import {
  pipe, map, prop, values,
  propOr, prepend, append, sum, filter, indexBy,
} from 'ramda';
import Link from '@mui/material/Link';
import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import propTypes from 'prop-types';

export default function ResultsTable({ data }) {
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const partsIndex = indexBy(prop('search'))(data.resolvedParts);

    setColumns(pipe(
      propOr([], 'resolvedParts'),
      map((partData) => ({
        field: prop('search', partData),
        headerName: prop('name', partData),
        width: 120,
        sortable: true,
        valueGetter: ({ value }) => (
          value.available ? propOr(Infinity, 'price')(value) : Infinity
        ),
        renderCell: ({ value, row, field }) => (
          <Link target="_blank" href={partsIndex[field].url}>
            {value === Infinity ? 'N/A' : `$${value}`}
            {partsIndex[field].packageQuantity > 1 ? ` (${partsIndex[field].packageQuantity})` : ''}
          </Link>
        ),
      })),
      prepend({
        field: 'dealership',
        headerName: 'Dealership',
        sortable: false,
        width: 250,
        renderCell: ({ value }) => (
          <Link target="_blank" href={value.switchUrl}>
            {value.name}
          </Link>
        ),
      }),
      append({
        field: 'total',
        headerName: 'Total',
        sortable: true,
        valueGetter: ({ row }) => (
          pipe(
            values,
            filter((value) => value.available),
            map(propOr(Infinity, 'price')),
            sum,
            (value) => Number(value.toFixed(2)),
          )(row)
        ),
        renderCell: ({ value }) => (
          <span>
            {value === Infinity ? 'N/A' : `$${value}`}
          </span>
        ),
      }),
    )(data));

    setRows(pipe(
      propOr([], 'searchResults'),
      map((rowData) => ({
        id: rowData.dealership.id,
        dealership: rowData.dealership,
        ...pipe(
          indexBy(prop('search')),
        )(rowData.results),
      })),
    )(data));
  }, [data]);

  return (
    <DataGrid
      rowHeight={30}
      sx={{ overflow: 'auto' }}
      rows={rows}
      columns={columns}
      initialState={{}}
      pageSizeOptions={[5]}
      disableRowSelectionOnClick
      hideFooter
    />
  );
}

ResultsTable.propTypes = {
  data: propTypes.shape({
    resolvedParts: propTypes.arrayOf(propTypes.shape({
      search: propTypes.string.isRequired,
      name: propTypes.string.isRequired,
      url: propTypes.string.isRequired,
    })).isRequired,
  }).isRequired,
};
