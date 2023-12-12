/* @ts-ignore */
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
  Availability,
  Dealership,
  ResolvedPart,
  SearchData,
  SearchResult,
  SearchResultPart,
} from '../types';

interface Props {
  data: SearchData;
}

function availabilityToColor(availability: Availability) {
  switch (availability) {
    case Availability.IN_STOCK:
      return 'green';
    case Availability.OUT_OF_STOCK:
      return 'red';
    default:
      return undefined;
  }
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
          sortComparator: (v1, v2) => {
            return v1.price - v2.price;
          },
          renderCell: ({ value, field }: GridRenderCellParams) => (
            <Link
              target="_blank"
              href={partsIndex[field].url}
              sx={{
                color: availabilityToColor(value.available),
              }}
            >
              ${value.price.toFixed(2)}
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
              filter<SearchResultPart>((value) => isSearchResultPart(value)),
              map<SearchResultPart, number>((value) => value?.price),
              sum,
            )(row),
          renderCell: ({ value }) => <span>${value.toFixed(2)}</span>,
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
