import * as vscode from "vscode";
import { DatabaseProcessor } from "../db/DatabaseProcessor";
import { ConnectionStatus, IConfig } from "../view/app/model";
import { IRefreshCallback, RefreshWithoutCallback } from "./IRefreshCallback";

export class DbConnectionUpdater {
    constructor (){}
    private locked: boolean = false;

    public async updateConnectionStatuses (context: vscode.ExtensionContext) {
        this.updateConnectionStatusesWithRefreshCallback(context, new RefreshWithoutCallback());
    }

    public async updateConnectionStatusesWithRefreshCallback (context: vscode.ExtensionContext, refreshCallback: IRefreshCallback) {
        if (this.locked === false){
            this.locked = true;
            
            await this.updateStatuses(context,refreshCallback);

            this.locked = false;
        }
    }

    private async updateStatuses(context: vscode.ExtensionContext, refreshCallback: IRefreshCallback){
        
        let connections = context.globalState.get<{ [id: string]: IConfig }>(`pro-bro.dbconfig`);

        if (!connections || Object.keys(connections).length === 0) {
            return;
        }

        for (let id of Object.keys(connections)) {
            connections![id].conStatus = ConnectionStatus.Connecting;
            this.updateStatus(connections, context, refreshCallback);
            await this.wait();

            const data = await DatabaseProcessor.getInstance().getDBVersion(connections[id]);
            if (data instanceof Error || ("error" in data)) {
                connections[id].conStatus = ConnectionStatus.NotConnected;
            } 
            else{
                connections[id].conStatus = ConnectionStatus.Connected;
            }
            this.updateStatus(connections, context, refreshCallback);
        }
    }

    private updateStatus(connections: {[id: string]: IConfig } | undefined, context: vscode.ExtensionContext, refreshCallback: IRefreshCallback){
        context.globalState.update(`pro-bro.dbconfig`, connections);
        refreshCallback.refresh();
    }

    private wait(): Promise<void> {
        return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 250);
        });
    }
}