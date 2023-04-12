import * as vscode from "vscode";
import { IConfig, ITableData, TableDetails } from "../view/app/model";
import { IProcessor } from "./IProcessor";
import * as cp from "child_process";
import { IOEError, IOEParams, IOETableData, IOETablesList, IOEVersion } from "./Oe";
import getOEClient from "./OeClient";
import { SortColumn } from "react-data-grid";
import { resolve } from "path";
import { Logger } from "../common/Logger";

export class DatabaseProcessor implements IProcessor {

    private static instance: DatabaseProcessor;
    private static isProcessRunning: boolean = false;
    
    private readonly configuration = vscode.workspace.getConfiguration("ProBro");
    private logger = new Logger(this.configuration.get("logging.node")!);

    private constructor() { }

    public static getInstance(): DatabaseProcessor {
        if (!DatabaseProcessor.instance) {
            DatabaseProcessor.instance = new DatabaseProcessor();
        }

        return DatabaseProcessor.instance;
    }

    public execShell(params: IOEParams): Promise<any> {
        const cmd = `${Buffer.from(JSON.stringify(params)).toString('base64')}`;
        if (DatabaseProcessor.isProcessRunning) {
            vscode.window.showInformationMessage("Processor is busy");
            return Promise.resolve(new Error("Processor is busy"));
        }

        DatabaseProcessor.isProcessRunning = true;
        this.logger.log("execShell params:", params);
        var timeInMs = Date.now();

        return getOEClient()
            .then((client) => {
                console.log(cmd);
                return client.sendCommand(cmd);
            })
            .then((data) => {
                var json = JSON.parse(data);
                console.log(`Process time: ${Date.now() - timeInMs}, OE time: ${json.debug.time}, Connect time: ${json.debug.timeConnect}`);
                console.log(json.debug);
                this.logger.log("getOEClient returns :", json);
                DatabaseProcessor.isProcessRunning = false;
                return json;
            });

        /*
                return new Promise<string>((resolve, reject) => {
            const cmd = `${this.context.extensionPath}/resources/oe/scripts/oe.bat -b -p "${this.context.extensionPath}/resources/oe/oe.p" -param "${Buffer.from(JSON.stringify(params)).toString('base64')}"`;
                    cp.exec(cmd, (err, out) => {
                        if (err) {
                            console.log("STDERR: ", err);
                            return reject(err);
                        }
                        return resolve(out);
                    });
                }).then((data) => {
                    //console.log("output data: ", data)
                    var json = JSON.parse(data);
                    console.log(`Process time: ${Date.now() - timeInMs}, OE time: ${json.debug.time}, Connect time: ${json.debug.timeConnect}`);
                    return json;
                });
        */

    }

    private getConnectionString(config: IConfig) {
        if (!config.params.includes("-ct"))
            if (config.params == "")
                config.params += "-ct 1"
            else
                config.params += " -ct 1"
                
        var connectionString = `-db ${config.name} ${config.user ? '-U ' + config.user : ''} ${config.password ? '-P ' + config.password : ''} ${config.host ? '-H ' + config.host : ''} ${config.port ? '-S ' + config.port : ''} ${config.params}`;
        return connectionString;
    }

    public getDBVersion(config: IConfig): Promise<any> {
        var params: IOEParams = {
            connectionString: this.getConnectionString(config),
            command: "get_version"
        };
        return this.execShell(params);
    }

    public getTablesList(config: IConfig): Promise<any> {
        var params: IOEParams = {
            connectionString: this.getConnectionString(config),
            command: "get_tables"
        };
        // const cmd = `${this.context.extensionPath}/resources/oe/scripts/oe.bat -b -p "${this.context.extensionPath}/resources/oe/oe.p" -param "${Buffer.from(JSON.stringify(params)).toString('base64')}"`;
        return this.execShell(params);
    }

    public getTableData(config: IConfig, tableName: string | undefined, inputParams: ITableData | undefined) {
        //        wherePhrase: string, start: number, pageLength: number, lastRowID: string, sortColumns: SortColumn[], filters: any, timeOut: number): Promise<IOETableData> {
        if (config && tableName && inputParams) {
            var params: IOEParams = {
                connectionString: this.getConnectionString(config),
                command: "get_table_data",
                params: { tableName: tableName, ...inputParams }
            };
            return this.execShell(params);
        } else {
            return Promise.resolve({columns: [], data: []});
        }
    }

    public submitTableData(config: IConfig, tableName: string | undefined, inputParams: ITableData | undefined) {
        //        wherePhrase: string, start: number, pageLength: number, lastRowID: string, sortColumns: SortColumn[], filters: any, timeOut: number): Promise<IOETableData> {
        if (config && tableName && inputParams) {
            var params: IOEParams = {
                connectionString: this.getConnectionString(config),
                command: "submit_table_data",
                params: { tableName: tableName, ...inputParams }
            };
            return this.execShell(params);
        } else {
            return Promise.resolve({ columns: [], data: [] });
        }
    }

    public getTableDetails(config: IConfig | undefined, tableName: string | undefined): Promise<TableDetails> {
        if (config && tableName) {
            var params: IOEParams = {
                connectionString: this.getConnectionString(config),
                command: "get_table_details",
                params: tableName
            };
            return this.execShell(params);
        } else {
            return Promise.resolve( { fields: [], indexes: [] });
        }
    }

}