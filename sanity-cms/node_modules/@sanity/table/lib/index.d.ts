import { JSX as JSX_2 } from 'react';
import { ObjectInputProps } from 'sanity';
import { Plugin as Plugin_2 } from 'sanity';
import type { PreviewProps } from 'sanity';

export declare const table: Plugin_2<void | TableConfig>;

export declare const TableComponent: (
  props: TableProps & {
    rowType?: string;
  }
) => JSX_2.Element;

export declare interface TableConfig {
  rowType?: string;
}

export declare const TablePreview: (
  props: ValueProps & PreviewProps
) => JSX_2.Element;

export declare type TableProps = ObjectInputProps<TableValue>;

export declare type TableRow = {
  _type: string;
  _key: string;
  cells: string[];
};

export declare interface TableValue {
  _type: 'table';
  rows: TableRow[];
}

declare interface ValueProps {
  rows?: TableRow[];
  title?: string;
}

export {};
