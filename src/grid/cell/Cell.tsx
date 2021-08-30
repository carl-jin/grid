import GridElement from "@/grid/GridElement";
import SelectionRange from "@/selection/SelectionRange";
import { CellPosition, ColumnOptions, Coordinate } from "@/types";
import { classes, isObjectEqual } from "@/utils";
import { DOM } from "@/utils";
import { createRef } from "preact";
import { CellValueChangedEvent } from "../Events";

import styles from './cell.module.css';
import CellEditor from "./CellEditor";

interface CellProps {
    row: string;
    column: ColumnOptions;
    onDbClick?: (ev: MouseEvent, row: string, col: string) => void;
    onMouseDown?: (ev: MouseEvent, row: string, col: string) => void
    onMouseMove?: (ev: MouseEvent, row: string, col: string) => void
    onMouseUp?: (ev: MouseEvent, row: string, col: string) => void
}

interface Boundary {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
}

interface CellState {
    active?: boolean;
    selected?: boolean;
    boundary: Boundary;
    width: number;
}

class Cell extends GridElement<CellProps, CellState> {

    protected cell = createRef<HTMLDivElement>();

    protected cellContent = createRef<HTMLDivElement>();

    protected coord: Coordinate;

    protected timer: number = null;

    protected io: IntersectionObserver;

    protected isEditing: boolean;

    protected editor: CellEditor<any>;

    constructor(props: CellProps) {
        super(props);

        this.state = {
            width: props.column.width,
            selected: false,
            active: false,
            boundary: { left: false, top: false, bottom: false, right: false }
        }

        this.coord = this.grid.getCoordinate(this.props.row, this.props.column.field);
        this.io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.doRender();
                this.io.disconnect();
            }
        }, { threshold: 0.000001 })
    }

    componentDidMount() {
        this.grid.addListener('selectionChanged', this.handleSelectionChanged);
        this.grid.addListener('cellValueChanged', this.handleCellValueChanged);
        this.grid.addListener('startCellEditing', this.handleStartCellEditing);
        this.grid.addListener('stopEditing', this.handleStopEditing);
        this.grid.addListener('columnWidthChanged', this.handleColumnWidthChange);
        this.handleSelectionChanged(this.grid.getSelectionRanges());
        this.io.observe(this.cell.current);
    }

    componentWillUnmount() {
        this.grid.removeListener('selectionChanged', this.handleSelectionChanged);
        this.grid.removeListener('cellValueChanged', this.handleCellValueChanged);
        this.grid.removeListener('startCellEditing', this.handleStartCellEditing);
        this.grid.removeListener('stopEditing', this.handleStopEditing);
        this.grid.removeListener('columnWidthChanged', this.handleColumnWidthChange);
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    protected getValue(raw: boolean = false): any {
        if (raw) {
            return this.grid.getRawCellValue(this.props.row, this.props.column.field);
        }

        return this.grid.getCellValue(this.props.row, this.props.column.field);
    }

    public setValue(value: any) {
        this.grid.setCellValue(this.props.row, this.props.column.field, value);
    }

    // render cell component
    protected doRender() {
        this.timer = setTimeout(() => {
            if (this.props.column.cellRender) {
                const render = new this.props.column.cellRender();
                render.init && render.init({
                    props: this.props.column.cellParams,
                    value: this.getValue(true),
                    column: this.props.column,
                });

                this.timer = null;

                if (!this.cellContent.current) {
                    return;
                }

                DOM.clean(this.cellContent.current);
                this.cellContent.current.appendChild(render.gui());
                render.afterAttached && render.afterAttached();
            } else {
                this.cellContent.current && (this.cellContent.current.textContent = this.getValue());
            }
        }, 0);
    }

    // If the current cell is selected, modify the cell to be selected style
    protected handleSelectionChanged = (selections: SelectionRange[]) => {

        let selected = false;
        let boundary = { left: false, top: false, bottom: false, right: false };

        for (let i in selections) {
            const s = selections[i];
            if (!s.contains(this.coord)) {
                continue;
            }

            selected = true;

            s.isLeft(this.coord) && (boundary.left = true);
            s.isRight(this.coord) && (boundary.right = true);
            s.isTop(this.coord) && (boundary.top = true);
            s.isBottom(this.coord) && (boundary.bottom = true);
        }

        if (selected != this.state.selected || !isObjectEqual(boundary, this.state.boundary)) {
            this.setState({
                selected: selected,
                boundary: boundary
            });
        }
    }

    // Re-render the cell when the value changes
    protected handleCellValueChanged = (ev: CellValueChangedEvent) => {
        if (ev.row === this.props.row && ev.column === this.props.column.field) {
            this.doRender();
        }
    }

    // 
    // Resize
    // 

    protected handleColumnWidthChange = ({ field, width }: { field: string, width: number }) => {
        if (field === this.props.column.field) {
            this.setState({ width });
        }
    }

    // 
    // Editing
    // 

    protected handleStartCellEditing = (pos: CellPosition) => {
        if (pos.row !== this.props.row || pos.column !== this.props.column.field || !this.props.column.cellEditor) {
            return;
        }

        this.isEditing = true;
        const popup = document.createElement('div');
        DOM.clean(this.cellContent.current);
        DOM.appendClassName(this.cellContent.current, styles.cellEditing);

        if (!this.editor) {
            this.editor = new this.props.column.cellEditor();
        }

        if (this.editor.isPopup()) {
            popup.className = `${styles.cellEditingWrapper} ${styles.cellEditingPopup}`;
        } else {
            popup.className = styles.cellEditingWrapper;
        }

        this.editor.init && this.editor.init({
            props: this.props.column.cellParams,
            value: this.getValue(true),
            column: this.props.column,
        });

        popup.appendChild(this.editor.gui());
        this.cellContent.current.appendChild(popup);
        this.editor.afterAttached && this.editor.afterAttached();
    }

    protected handleStopEditing = () => {
        if (!this.isEditing) {
            return;
        }

        this.isEditing = false;
        DOM.setClassNames(this.cellContent.current, [styles.cellContent]);
        this.setValue(this.editor.getValue());
    }

    // Event handlers
    protected handleMouseDown = (ev: MouseEvent) => {
        if (this.isEditing) return;
        this.props.onMouseDown && this.props.onMouseDown(ev, this.props.row, this.props.column.field);
    }

    protected handleMouseMove = (ev: MouseEvent) => {
        if (this.isEditing) return;
        this.props.onMouseMove && this.props.onMouseMove(ev, this.props.row, this.props.column.field);
    }

    protected handleMouseUp = (ev: MouseEvent) => {
        if (this.isEditing) return;
        this.props.onMouseUp && this.props.onMouseUp(ev, this.props.row, this.props.column.field);
    }

    protected handleDbClick = (ev: MouseEvent) => {
        if (this.isEditing) return;
        this.props.onDbClick && this.props.onDbClick(ev, this.props.row, this.props.column.field);
    }

    render() {

        const cellStyle: { [key: string]: any } = {
            width: this.state.width,
        }

        if (this.props.column.flex) {
            cellStyle.flexGrow = 1;
        }

        const className = classes({
            [styles.cell]: true,
            [styles.cellSelected]: this.state.selected,
            [styles.cellLeftBoundary]: this.state.boundary.left,
            [styles.cellRightBoundary]: this.state.boundary.right,
            [styles.cellTopBoundary]: this.state.boundary.top,
            [styles.cellBottomBoundary]: this.state.boundary.bottom,
        })

        return (
            <div
                ref={this.cell}
                className={className}
                style={cellStyle}
                onMouseDown={this.handleMouseDown}
                onMouseMove={this.handleMouseMove}
                onMouseUp={this.handleMouseUp}
                onDblClick={this.handleDbClick}
            >
                <div ref={this.cellContent} className={styles.cellContent}></div>
            </div>
        );
    }

}

export default Cell;
