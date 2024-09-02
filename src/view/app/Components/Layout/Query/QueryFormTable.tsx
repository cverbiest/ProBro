import { UIEvent, useMemo } from 'react';

import DataGrid, {
    SortColumn,
    CopyEvent,
    DataGridHandle,
} from 'react-data-grid';

import { Box } from '@mui/material';
import { IFilters } from '@app/common/types';
import ColumnHeaderCell from './ColumnHeaderCell';

interface QueryFormTableProps {
    queryGridRef: React.RefObject<DataGridHandle>;
    selected: any[];
    sortColumns: SortColumn[];
    handleScroll: (event: UIEvent<HTMLDivElement>) => void;
    onSortClick: (inputSortColumns: SortColumn[]) => void;
    filters: IFilters;
    selectedRows: Set<string>;
    setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
    rowKeyGetter: (row: any) => string;
    readRecord: (row: any) => void;
    handleCopy: (event: CopyEvent<any>) => void;
    windowHeight: number;
    setRowHeight: () => number;
    configuration: any;
    rows: any[];
    reloadData: (loaded: number) => void;
    setFilters: (data: IFilters) => void;
}

const QueryFormTable: React.FC<QueryFormTableProps> = ({
    queryGridRef,
    selected,
    sortColumns,
    handleScroll,
    onSortClick,
    filters,
    selectedRows,
    setSelectedRows,
    rowKeyGetter,
    readRecord,
    handleCopy,
    windowHeight,
    setRowHeight,
    configuration,
    rows,
    reloadData,
    setFilters,
}) => {
    const adjustedColumns = useMemo(
        () =>
            selected.map((col, index) => ({
                ...col,
                headerRenderer:
                    index === 0
                        ? undefined
                        : (props) =>
                              ColumnHeaderCell({
                                  ...props,
                                  reloadData,
                                  configuration,
                                  filters,
                                  setFilters,
                              }),
            })),
        [selected, reloadData, configuration, filters, setFilters]
    );

    const calculateHeight = () => {
        const rowCount = rows.length;
        const cellHeight = getCellHeight();
        const startingHeight = 85;
        const calculatedHeight = startingHeight + rowCount * cellHeight;
        return calculatedHeight;
    };

    const getCellHeight = () => {
        if (configuration.gridTextSize === 'Large') {
            return 40;
        } else if (configuration.gridTextSize === 'Medium') {
            return 30;
        } else if (configuration.gridTextSize === 'Small') {
            return 20;
        }
        return 30;
    };

    return (
        <Box>
            <DataGrid
                ref={queryGridRef}
                columns={adjustedColumns}
                rows={rows}
                defaultColumnOptions={{
                    sortable: true,
                    resizable: true,
                }}
                sortColumns={sortColumns}
                onScroll={handleScroll}
                onSortColumnsChange={onSortClick}
                className={filters.enabled ? 'filter-cell' : ''}
                headerRowHeight={filters.enabled ? 70 : undefined}
                style={{
                    height: calculateHeight(),
                    overflow: 'auto',
                    minHeight: 105,
                    maxHeight: windowHeight - 120,
                    whiteSpace: 'pre',
                }}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows}
                rowKeyGetter={rowKeyGetter}
                onRowDoubleClick={readRecord}
                onCopy={handleCopy}
                rowHeight={setRowHeight}
            ></DataGrid>
        </Box>
    );
};

export default QueryFormTable;
