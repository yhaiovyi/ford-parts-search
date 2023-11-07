import {
  pipe,
  map,
  prop,
  propOr,
  prepend,
  indexBy,
  append,
  values,
  filter,
  sum,
} from 'ramda';
import Link from '@mui/material/Link';
import { useEffect, useState } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridValidRowModel,
  GridValueGetterParams,
} from '@mui/x-data-grid';
import propTypes from 'prop-types';

import {
  Dealership,
  ResolvedPart,
  SearchData,
  SearchResult,
  SearchResultPart,
} from '../types';

interface Props {
  data: SearchData;
}

type RowModelValue = SearchResultPart | Dealership | string;
function isSearchResultPart(value: RowModelValue): value is SearchResultPart {
  return value instanceof Object && 'price' in value;
}

interface RowModel extends GridValidRowModel {
  [key: string]: RowModelValue;
}

export default function ResultsTable({ data }: Readonly<Props>) {
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const partsIndex = indexBy<ResolvedPart>(prop('search'))(
      data.resolvedParts,
    );

    setColumns(
      pipe(
        propOr([], 'resolvedParts'),
        map<ResolvedPart, GridColDef>((partData) => ({
          field: prop('search', partData),
          headerName: prop('name', partData),
          width: 120,
          sortable: true,
          valueGetter: ({ value }: GridValueGetterParams) =>
            value.available ? propOr(Infinity, 'price')(value) : Infinity,
          renderCell: ({ value, field }: GridRenderCellParams) => (
            <Link target="_blank" href={partsIndex[field].url}>
              {value === Infinity ? 'N/A' : `$${value}`}
              {partsIndex[field].packageQuantity > 1
                ? ` (${partsIndex[field].packageQuantity})`
                : ''}
            </Link>
          ),
        })),
        prepend<GridColDef>({
          field: 'dealership',
          headerName: 'Dealership',
          sortable: false,
          width: 250,
          renderCell: ({ value }: GridRenderCellParams) => (
            <Link target="_blank" href={value.switchUrl}>
              {value.name}
            </Link>
          ),
        }),
        append<GridColDef>({
          field: 'total',
          headerName: 'Total',
          sortable: true,
          valueGetter: ({ row }: GridValueGetterParams<RowModel>) =>
            pipe(
              values<RowModel>,
              filter<RowModelValue>(
                (value) => isSearchResultPart(value) && value.available,
              ),
              map<RowModelValue, number>(propOr(Infinity, 'price')),
              sum,
              (value) => Number(value.toFixed(2)),
            )(row),
          renderCell: ({ value }) => (
            <span>{value === Infinity ? 'N/A' : `$${value}`}</span>
          ),
        }),
      )(data),
    );

    setRows(
      pipe(
        propOr([], 'searchResults'),
        map<SearchResult, any>((rowData) => ({
          id: rowData.dealership.id,
          dealership: rowData.dealership,
          ...pipe(indexBy<SearchResultPart>(prop('search')))(rowData.results),
        })),
      )(data),
    );
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
    resolvedParts: propTypes.arrayOf(
      propTypes.shape({
        search: propTypes.string.isRequired,
        name: propTypes.string.isRequired,
        url: propTypes.string.isRequired,
      }),
    ).isRequired,
  }).isRequired,
};
