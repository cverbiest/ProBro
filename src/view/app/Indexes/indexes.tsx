import * as React from "react";
import { useState, useMemo } from "react";
import { IndexRow, TableDetails } from "../model";
import DataGrid from "react-data-grid";
import type { SortColumn } from "react-data-grid";
import * as columnName from "./column.json";
import { Logger } from "../../../common/Logger";
import { ISettings } from "../../../common/IExtensionSettings";

interface IConfigProps {
    tableDetails: TableDetails
    configuration: ISettings;
}

type Comparator = (a: IndexRow, b: IndexRow) => number;
function getComparator(sortColumn: string): Comparator {
    switch (sortColumn) {
        case "cName":
        case "cFlags":
        case "cFields":
            return (a, b) => {
                return a[sortColumn].localeCompare(b[sortColumn]);
            };
        default:
            throw new Error(`unsupported sortColumn: "${sortColumn}"`);
    }
}

function rowKeyGetter(row: IndexRow) {
    return row.cName;
}

function Indexes({ tableDetails, configuration }: IConfigProps) {
    const [rows, setRows] = useState(tableDetails.indexes);
    const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
    const [selectedRows, setSelectedRows] = useState<ReadonlySet<string>>(
        () => new Set()
    );
    const [windowHeight, setWindowHeight] = React.useState(window.innerHeight);
    const logger = new Logger(configuration.logging.react);

    const windowRezise = () => {
        setWindowHeight(window.innerHeight);
    };

    window.addEventListener('contextmenu', e => {
        e.stopImmediatePropagation()
    }, true);

    React.useEffect(() => {
        window.addEventListener('resize', windowRezise);

        return () => {
            window.removeEventListener('resize', windowRezise);
        };
    }, []);

    const sortedRows = useMemo((): readonly IndexRow[] => {
        if (sortColumns.length === 0) {
            return rows;
        }

        return [...rows].sort((a, b) => {
            for (const sort of sortColumns) {
                const comparator = getComparator(sort.columnKey);
                const compResult = comparator(a, b);
                if (compResult !== 0) {
                    return sort.direction === "ASC" ? compResult : -compResult;
                }
            }
            return 0;
        });
    }, [rows, sortColumns]);

    React.useLayoutEffect(() => {
        window.addEventListener("message", (event) => {
            const message = event.data;
            logger.log("indexes explorer data", message);
            switch (message.command) {
                case "data":
                    setRows(message.data.indexes);
            }
        });
    });

    return (
        <div>
            {rows.length > 0 ? (
                <DataGrid
                    columns={columnName.columns}
                    rows={sortedRows}
                    defaultColumnOptions={{
                        sortable: true,
                        resizable: true,
                    }}
                    selectedRows={selectedRows}
                    onSelectedRowsChange={setSelectedRows}
                    rowKeyGetter={rowKeyGetter}
                    onRowsChange={setRows}
                    sortColumns={sortColumns}
                    onSortColumnsChange={setSortColumns}
                    style={{ height: windowHeight}}
                />
            ) : null}
        </div>
    );
}

export default Indexes;
