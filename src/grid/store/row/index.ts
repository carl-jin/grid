import { Store as BaseStore } from "@/grid/store";
import { CellPosition, RowData } from "@/types";
import update from 'immutability-helper';

export interface Actions {
    setCellValue: {
        row: string;
        column: string;
        value: any
    };
    setHoveredRow: string | undefined;
    selectRows: string[];
    appendRows: RowData[];
    clear: undefined;
}

export interface State {
    rows: RowData[];
    rowIndexes: Record<string, number>;
    hoveredRow?: string;
    selectedRows: string[];
    height: number;
}

const initialState: State = {
    rows: [],
    rowIndexes: {},
    selectedRows: [],
    height: 28,
};

export class Store extends BaseStore<State, Actions> {

    constructor(initial?: Partial<State>) {
        super({
            setCellValue: [],
            setHoveredRow: [],
            selectRows: [],
            appendRows: [],
            clear: [],
        }, Object.assign({}, initialState, initial));

        this.handle('setCellValue', (state, { row, column, value }) => {
            const index = state.rowIndexes[row];
            if (index === undefined) return state;

            return update(state, {
                rows: {
                    [index]: { [column]: { $set: value } }
                }
            });
        });

        this.handle('appendRows', (state, rows) => {

            // If the newly added row already exists,
            // use the new data to overwrite the old data
            // and do not add a new one
            rows = rows.filter((row) => {
                const i = state.rowIndexes[row.id];
                if (i !== undefined) {
                    state.rows[i] = row;
                    return false;
                }
                return true;
            });

            // Reset row indexes
            const rowIndexes: Record<string, number> = {};
            rows = [...state.rows, ...rows];
            rows.forEach((r, i) => {
                rowIndexes[r.id] = i;
            })

            return { ...state, rows, rowIndexes };
        });

        this.handle('setHoveredRow', (state, row) => {
            if (row === undefined || state.rowIndexes[row] !== undefined) {
                return { ...state, hoveredRow: row };
            }

            return state;
        });

        this.handle('selectRows', (state, rows) => {
            rows = rows.filter(r => {
                return state.rowIndexes[r] !== undefined;
            });

            return { ...state, selectedRows: rows };
        });

        this.handle('clear', (state) => {
            return { ...state, rowIndexes: {}, rows: [], hoveredRow: undefined, selectedRows: [] };
        });
    }

    public getRowIdByIndex(y: number) {
        return this._state.rows[y].id;
    }

    public getRowIndex(id: string) {
        return this._state.rowIndexes[id];
    }

    // Get the original cell data without applying transformer
    public getRawCellValue(row: string, column: string): any {
        const index = this._state.rowIndexes[row];
        if (index === undefined) {
            return undefined;
        }

        if (column === '#') {
            return index + 1;
        }

        return this._state.rows[index][column];
    }
}

export default Store;