import { CellRenderer, CellEditor, CellTransformer } from "@/grid/cell";
import Grid from "./grid";

export interface MenuItem {
    separator?: boolean;
    disabled?: boolean;
    name?: string;
    icon?: string;
    action?: () => void;
    subMenus?: MenuItem[];
}

export interface GetContextMenuItemsParams {
    row: string;
    column: string; // the column that was clicked
    grid: Grid;
}

export interface Styles {
    [key: string]: string;
}

export interface CellPosition {
    row: string;
    column: string;
}

export interface Coordinate {
    x: number;
    y: number;
}

export interface RowData {
    id: string;
    [key: string]: any;
}

interface ICellRenderer {
    new(): CellRenderer<unknown>;
}

interface ICellEditor {
    new(): CellEditor<unknown>;
}

export interface BaseColumnOptions {
    width?: number; // default is 200
    minWidth?: number; // default is 50
    flex?: number;
    resizable?: boolean;
    pinned?: 'left' | 'right';
    transformer?: CellTransformer;
    cellRender?: ICellRenderer;
    cellParams?: any;
    cellEditor?: ICellEditor;
}

export interface ColumnOptions extends BaseColumnOptions {
    field: string;
    headerName?: string;
    readonly?: boolean;
}

export interface GridOptions {
    width?: string; // default is 100%
    height?: string; // default is 100%
    columns: ColumnOptions[];
    defaultColumnOption?: BaseColumnOptions;
    rows: RowData[];
    // headers
    headerHeight?: number; // default is 30
    // row
    rowHeight?: number; // default is 28
    // virtual list
    preloadRowCount?: number; // default is 20
    // other
    fillable?: 'x' | 'y' | 'xy';
    // context menus
    getContextMenuItems?: (params: GetContextMenuItemsParams) => MenuItem[];
}
