/* eslint-disable no-await-in-loop, no-console, no-restricted-syntax */
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import asyncPool from 'tiny-async-pool';
import axiosRetry from 'axios-retry';
import he from 'he';
import {
  defaultTo,
  head,
  match,
  pipe,
  prop,
  propOr,
  replace,
  split,
  trim,
} from 'ramda';
import { ResolvedPart, ResolvedParts, SearchResult } from '../types';

interface Location {
  latitude: number;
  longitude: number;
}

type OnPartsResolved = (parts: ResolvedParts) => void;

type OnSearchResult = (result: SearchResult) => void;

type OnSearchProgress = (progress: number) => void;

interface SearchOptions {
  searches: string[];
  concurrency?: number;
  maxDealerships?: number;
  radius?: number;
  location: Location;
  onPartsResolved?: OnPartsResolved;
  onSearchResult?: OnSearchResult;
  onSearchProgress?: OnSearchProgress;
  signal?: AbortSignal;
}

interface ResolvedPartWithParams extends ResolvedPart {
  params: {
    skuID: string;
    mfPartNumber: string;
    uniqueID: string;
  };
}

interface UnresolvedPart {
  search: string;
}

const searchParts = async (options: SearchOptions) => {
  const searches: string[] = propOr([], 'searches', options);
  const concurrency: number = propOr(10, 'concurrency', options);
  const maxDealerships: number = propOr(1000000, 'maxDealerships', options);
  const radius: number = propOr(100, 'radius', options);
  const location: Location = prop('location', options);
  const onPartsResolved: OnPartsResolved = propOr(
    () => {},
    'onPartsResolved',
    options,
  );
  const onSearchResult: OnSearchResult = propOr(
    () => {},
    'onSearchResult',
    options,
  );
  const onSearchProgress: OnSearchProgress = propOr(
    () => {},
    'onSearchProgress',
    options,
  );
  let aborted = false;

  if (options.signal) {
    aborted = options.signal.aborted;
    options.signal.addEventListener('abort', () => {
      aborted = true;
      console.log('Aborting search...');
    });
  }

  if (aborted) return null;

  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      headers: {
        'accept-language': 'en-US,en;q=0.9,ru;q=0.8',
      },
      timeout: 20000,
      jar,
    }),
  );
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
  });

  const resolvedParts: ResolvedParts = [];
  const searchResults = [];
  const dealersResponse = await client.get(
    `https://parts.ford.com/wcs/resources/store/1405/storelocator/latitude/${location.latitude}/longitude/${location.longitude}?radius=${radius}&radiusUOM=miles&maxItems=${maxDealerships}&siteLevelStoreSearch=false&responseFormat=json`,
  );
  const dealersJson = dealersResponse.data;

  if (aborted) return null;

  const parts = [];
  for await (const part of asyncPool(
    concurrency,
    searches,
    async (
      search: string,
    ): Promise<ResolvedPartWithParams | UnresolvedPart> => {
      console.log(`Resolving "${search}"`);
      const response = await client.get<string>(
        `https://parts.ford.com/webapp/wcs/stores/servlet/en/us/SearchDisplay?searchTerm=${search}&storeId=1405&catalogId=251&langId=-1&searchType=keyword`,
      );

      const partDataHref: string = pipe(
        match(
          /https:\/\/parts\.ford\.com\/shop\/FordProductPriceAndShopperActionsDisplayView[^']+/,
        ),
        propOr('', '0'),
      )(response.data) as string;
      const url: string = pipe(
        match(/<link rel="canonical" href="([^"]+)"/),
        propOr('', '1'),
      )(response.data) as string;
      const name: string = pipe(
        match(/<title>([^<]*)<\//),
        propOr('', '1'),
        split('|'),
        head,
        trim,
        he.decode,
      )(response.data);
      const packageQuantity: number = pipe(
        match(/Package Quantity:&nbsp;\s*(\d+)/m),
        propOr('1', '1'),
        parseInt,
      )(response.data);

      if (partDataHref) {
        const partUrl = new URL(partDataHref);
        const skuId = defaultTo('', partUrl.searchParams.get('skuID'));
        const partNumber = defaultTo(
          '',
          partUrl.searchParams.get('mfPartNumber'),
        );
        const uniqueId = defaultTo('', partUrl.searchParams.get('uniqueID'));

        return {
          search,
          name,
          url,
          packageQuantity,
          partNumber,
          params: {
            skuID: skuId,
            mfPartNumber: partNumber,
            uniqueID: uniqueId,
          },
        };
      }

      return {
        search,
      };
    },
  )) {
    if ('params' in part) {
      parts.push(part);
      resolvedParts.push({
        search: part.search,
        name: part.name,
        url: part.url,
        packageQuantity: part.packageQuantity,
        partNumber: part.params.mfPartNumber,
      });
      console.log(
        `Found ${part.search} as SKU: ${part.params.skuID}, part number: ${part.params.mfPartNumber}`,
      );
    } else {
      console.log(`Couldn't resolve the search "${part.search}"`);
    }
  }

  if (aborted) return null;
  onPartsResolved(resolvedParts);

  const { length } = dealersJson.PhysicalStore;
  for (let i = 0; i < length; i += 1) {
    if (aborted) return null;

    const dealership = dealersJson.PhysicalStore[i];
    const row: SearchResult = {
      dealership: {
        id: dealership.uniqueID,
        name: dealership.Description[0].displayStoreName,
        city: dealership.city,
        state: dealership.stateOrProvinceName,
        zip: trim(dealership.postalCode),
        phone: trim(dealership.telephone1),
        latitude: dealership.latitude,
        longitude: dealership.longitude,
        switchUrl: `https://parts.ford.com/shop/ContractSetInSession?catalogId=251&langId=-1&URL=https://parts.ford.com/shop/en/us/shop-parts&storeId=1405&dealerId=${dealership.uniqueID}`,
      },
      results: [],
    };

    await client.get(row.dealership.switchUrl);
    console.log(
      `Searching in ${dealership.Description[0].displayStoreName} (${
        i + 1
      }/${length})...`,
    );

    for await (const result of asyncPool(concurrency, parts, async (part) => {
      const response = await client.get(
        'https://parts.ford.com/shop/FordProductPriceAndShopperActionsDisplayView?catalogId=251&storeId=1405&langId=-1&buyable=true',
        { params: part.params },
      );

      const price: number = pipe(
        match(/<h2 id="yourPrice">([^<]*)<\/h2>/),
        propOr(NaN, '1'),
        trim,
        replace(/[^\d.]/g, ''),
        parseFloat,
      )(response.data);
      const availability: string = pipe(
        match(/inventoryMsg\s*:\s*([^\n]*)/),
        propOr('', '1'),
        trim,
      )(response.data);
      const available = [
        'In stock for pickup at dealership, or will ship next business day',
        'Most parts available next business day.',
      ].includes(availability);

      return {
        search: part.search,
        price,
        available,
      };
    })) {
      console.log(
        `${result.available ? '✅' : '❌'} ${result.search} / ${result.price}`,
      );
      row.results.push(result);
    }

    onSearchResult(row);
    onSearchProgress((i + 1) / length);
    searchResults.push(row);
  }

  return {
    resolvedParts,
    searchResults,
  };
};

export default searchParts;
